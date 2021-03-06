import { Contracts } from '@energyweb/issuer';
import { ConfigurationService, DeviceService } from '@energyweb/origin-backend';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { ethers } from 'ethers';
import { Log } from 'ethers/providers';
import moment from 'moment';

import { TransferService } from '../transfer/transfer.service';
import { TransferStatus } from '../transfer/transfer-status';
import { OrderService } from '../order/order.service';
import { AccountService } from '../account/account.service';
import { CreateAskDTO } from '../order/create-ask.dto';

@Injectable()
export class DepositWatcherService implements OnModuleInit {
    private readonly logger = new Logger(DepositWatcherService.name);

    private tokenInterface: ethers.utils.Interface;

    private walletAddress: string;

    private registryAddress: string;

    private provider: ethers.providers.JsonRpcProvider;

    private issuer: ethers.Contract;

    private registry: ethers.Contract;

    private deviceService: DeviceService;

    private issuerTypeId: string;

    public constructor(
        private readonly configService: ConfigService,
        private readonly transferService: TransferService,
        private readonly orderService: OrderService,
        private readonly accountService: AccountService,
        private readonly moduleRef: ModuleRef
    ) {
        this.issuerTypeId = this.configService.get<string>('ISSUER_ID');
    }

    public async onModuleInit() {
        this.logger.debug('onModuleInit');

        const originBackendConfigurationService = this.moduleRef.get(ConfigurationService, {
            strict: false
        });

        this.deviceService = this.moduleRef.get(DeviceService, {
            strict: false
        });

        const {
            contractsLookup: { registry, issuer }
        } = await originBackendConfigurationService.get();

        this.tokenInterface = new ethers.utils.Interface(Contracts.RegistryJSON.abi);

        this.walletAddress = this.configService.get<string>('EXCHANGE_WALLET_PUB');
        this.registryAddress = registry;

        const web3ProviderUrl = this.configService.get<string>('WEB3');
        this.provider = new ethers.providers.JsonRpcProvider(web3ProviderUrl);

        this.registry = new ethers.Contract(
            this.registryAddress,
            Contracts.RegistryJSON.abi,
            this.provider
        );

        this.issuer = new ethers.Contract(issuer, Contracts.IssuerJSON.abi, this.provider);

        const topics = [this.tokenInterface.events.TransferSingle.topic];
        const blockNumber = await this.transferService.getLastConfirmationBlock();

        this.logger.debug(`Starting from block ${blockNumber}`);

        this.provider.resetEventsBlock(blockNumber);
        this.provider.on(
            {
                address: this.registryAddress,
                topics
            },
            (event: Log) => this.processEvent(event)
        );
    }

    private async processEvent(event: Log) {
        this.logger.debug(`Discovered new event ${JSON.stringify(event)}`);

        const log = this.tokenInterface.parseLog(event);

        this.logger.debug(`Parsed to ${JSON.stringify(log)}`);

        const { _from: from, _to: to, _value: value, _id: id } = log.values;

        if (to !== this.walletAddress) {
            this.logger.debug(
                `This transfer is to other address ${to} than wallet address ${this.walletAddress}`
            );
            return;
        }

        const { transactionHash } = event;

        try {
            let transfer = await this.transferService.findOne(null, {
                where: { transactionHash }
            });

            if (transfer) {
                this.logger.debug(
                    `Deposit with transactionHash ${transactionHash} already exists and has status ${
                        TransferStatus[transfer.status]
                    } `
                );

                return;
            }

            const { generationFrom, generationTo, deviceId } = await this.decodeDataField(
                id.toString()
            );

            const amount = value.toString();

            transfer = await this.transferService.createDeposit({
                transactionHash,
                address: from as string,
                amount,
                asset: {
                    address: this.registryAddress,
                    tokenId: id.toString(),
                    deviceId,
                    generationFrom,
                    generationTo
                }
            });

            const receipt = await this.provider.waitForTransaction(transactionHash);

            await this.transferService.setAsConfirmed(transactionHash, receipt.blockNumber);

            this.logger.debug(
                `Successfully created deposit of tokenId=${id} from=${from} with value=${value} for user=${transfer.userId} `
            );

            await this.tryPostForSale(deviceId, from, amount, transfer.asset.id);
        } catch (error) {
            this.logger.error(error.message);
        }
    }

    private async decodeDataField(certificateId: string) {
        const { data } = await this.registry.functions.getCertificate(certificateId);

        const result = await this.issuer.functions.decodeData(data);

        return {
            generationFrom: moment.unix(result[0]).toDate(),
            generationTo: moment.unix(result[1]).toDate(),
            deviceId: result[2]
        };
    }

    private async tryPostForSale(
        deviceId: string,
        sender: string,
        amount: string,
        assetId: string
    ) {
        this.logger.debug(
            `Trying to post for sale deviceId=${deviceId} sender=${sender} amount=${amount} assetId=${assetId}`
        );

        const {
            id,
            automaticPostForSale,
            defaultAskPrice
        } = await this.deviceService.findByExternalId({
            id: deviceId,
            type: this.issuerTypeId
        });
        const { userId } = await this.accountService.findByAddress(sender);

        if (!automaticPostForSale) {
            this.logger.debug(`Device ${id} does not have automaticPostForSale enabled`);
            return;
        }

        const ask: CreateAskDTO = {
            price: defaultAskPrice,
            validFrom: new Date(),
            volume: amount,
            assetId
        };
        await this.orderService.createAsk(userId, ask);
    }
}
