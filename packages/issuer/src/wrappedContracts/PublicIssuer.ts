import Web3 from 'web3';

import { GeneralFunctions, ISpecialTx, Timestamp } from '@energyweb/utils-general';

import PublicIssuerJSON from '../../build/contracts/PublicIssuer.json';
import { PastEventOptions } from 'web3-eth-contract';

export class PublicIssuer extends GeneralFunctions {
    web3: Web3;

    constructor(web3: Web3, address?: string) {
        const buildFile: any = PublicIssuerJSON;
        super(
            address
                ? new web3.eth.Contract(PublicIssuerJSON.abi, address)
                : new web3.eth.Contract(
                      buildFile.abi,
                      buildFile.networks.length > 0 ? buildFile.networks[0] : null
                  )
        );
        this.web3 = web3;
    }

    async getAllEvents(eventFilter?: PastEventOptions) {
        return this.web3Contract.getPastEvents('allEvents', this.createFilter(eventFilter));
    }

    async encodeIssue(_from: Timestamp, _to: Timestamp, _deviceId: string, txParams?: ISpecialTx) {
        return this.web3Contract.methods.encodeIssue(_from, _to, _deviceId).call(txParams);
    }

    async decodeIssue(_data: number[], txParams?: ISpecialTx) {
        return this.web3Contract.methods.decodeIssue(_data).call(txParams);
    }

    async getRequestIssue(_requestIssueId: number, txParams?: ISpecialTx) {
        return this.web3Contract.methods.getRequestIssue(_requestIssueId).call(txParams);
    }

    async requestIssue(_data: any, txParams?: ISpecialTx) {
        const method = this.web3Contract.methods.requestIssue(_data);

        return this.send(method, txParams);
    }

    async requestIssueFor(_data: any, _forAddress: string, txParams?: ISpecialTx) {
        const method = this.web3Contract.methods.requestIssueFor(_data, _forAddress);

        return this.send(method, txParams);
    }

    async approveIssue(
        _to: string,
        _requestId: number,
        _value: number,
        _validityData: string,
        txParams?: ISpecialTx
    ) {
        const method = this.web3Contract.methods.approveIssue(
            _to,
            _requestId,
            _value,
            _validityData,
        );

        return this.send(method, txParams);
    }
    
    async version(txParams?: ISpecialTx) {
        return this.web3Contract.methods.version().call(txParams);
    }
}
