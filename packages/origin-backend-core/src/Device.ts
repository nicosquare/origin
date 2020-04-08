import { IOrganization } from '.';
import { BigNumber } from 'ethers/utils';

export enum DeviceStatus {
    Submitted,
    Denied,
    Active
}

export interface IExternalDeviceId {
    id: string;
    type: string;
}

export type ExternalDeviceIdType = Pick<IExternalDeviceId, 'type'> & {
    autogenerated?: boolean;
};

export interface ISmartMeterRead {
    meterReading: BigNumber;
    timestamp: number;
}

export interface IEnergyGenerated {
    energy: BigNumber;
    timestamp: number;
}

export interface ISmartMeterReadingsAdapter {
    getLatest(device: IDeviceWithRelationsIds): Promise<ISmartMeterRead>;
    getAll(device: IDeviceWithRelationsIds): Promise<ISmartMeterRead[]>;
    save(device: IDeviceWithRelationsIds, smRead: ISmartMeterRead): Promise<void>;
}

export interface IDeviceProductInfo {
    deviceType: string;
    region: string;
    province: string;
    country: string;
    operationalSince: number;
}

export interface IDeviceProperties extends IDeviceProductInfo {
    id: number;
    status: DeviceStatus;
    facilityName: string;
    description: string;
    images: string;
    address: string;
    capacityInW: number;
    gpsLatitude: string;
    gpsLongitude: string;
    timezone: string;
    complianceRegistry: string;
    otherGreenAttributes: string;
    typeOfPublicSupport: string;
    externalDeviceIds?: IExternalDeviceId[];
    lastSmartMeterReading?: ISmartMeterRead;
    deviceGroup?: string;
    smartMeterReads?: ISmartMeterRead[];
}

export interface IDevice extends IDeviceProperties {
    organization: IOrganization | IOrganization['id'];
}

export interface IDeviceWithRelationsIds extends IDevice {
    organization: IOrganization['id'];
}

export interface IDeviceWithRelations extends IDevice {
    organization: IOrganization;
}

export type DeviceCreateData = Omit<IDeviceProperties, 'id'>;
export type DeviceUpdateData = Pick<IDevice, 'status'>;
