// src/models/types.ts

type User = {
    id: string;
    name: string;
    email: string;
};


type Alert = {
    id: string;
    message: string;
    timestamp: Date;
};


type Acknowledgement = {
    alertId: string;
    userId: string;
    acknowledgedAt: Date;
};

export type { User, Alert, Acknowledgement };