export interface User {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    lockedOut?: Boolean;
    emailVerified?: Boolean;
    picture?: string;
}

export interface LocationsTable {
    id?: string;
    createdAt?: Date;
    uuid?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
}

export interface DevicesTable {
    id?: string;
    createdAt?: Date;
    uuid?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
}

export interface UserDevicesTable {
    id?: string;
    createdAt?: Date;
    uuid?: string;
    userId?: string;
    permission?: boolean;
    grantedUserId?: string;
}

export interface RequestsTable {
    id?: string;
    createdAt?: string;
    requestFrom: string;
    requestTo: string;
    permission: boolean;
};

export interface Ad {
    banner?: any;
    interstitial?: any;
}