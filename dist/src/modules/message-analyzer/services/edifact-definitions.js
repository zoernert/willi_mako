"use strict";
// src/modules/message-analyzer/services/edifact-definitions.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.edifactElementDefinitions = exports.edifactSegmentDefinitions = void 0;
exports.edifactSegmentDefinitions = {
    UNB: 'Interchange Header',
    UNH: 'Message Header',
    BGM: 'Beginning of Message',
    DTM: 'Date/Time/Period',
    NAD: 'Name and Address',
    LIN: 'Line Item',
    QTY: 'Quantity',
    PRI: 'Price Details',
    RFF: 'Reference',
    CAV: 'Characteristic Value',
    CCI: 'Characteristic Class ID',
    IMD: 'Item Description',
    MEA: 'Measurements',
    LOC: 'Place/Location Identification',
    CNT: 'Control Total',
    UNT: 'Message Trailer',
    UNZ: 'Interchange Trailer',
    // Common energy market segments (Germany)
    IDE: 'Identification',
    STS: 'Status',
    SEQ: 'Sequence Details',
    GIS: 'General Indicator',
    MEM: 'Membership Details',
    RCS: 'Requirements and Conditions',
    AGR: 'Agreement Identification',
    FII: 'Financial Institution Information',
    CUX: 'Currencies',
    PAT: 'Payment Terms Basis',
    PAI: 'Payment Instruction',
    TAX: 'Duty/Tax/Fee Details',
    MOA: 'Monetary Amount',
    ALC: 'Allowance or Charge',
    PCD: 'Percentage Details',
    FTX: 'Free Text',
    COM: 'Communication Contact',
    CTA: 'Contact Information',
};
exports.edifactElementDefinitions = {
    NAD: {
        'MS': 'Message Sender',
        'MR': 'Message Receiver',
        'DP': 'Delivery Party',
        'IV': 'Invoicee',
        'SU': 'Supplier',
        'DD': 'Delivery-point operator',
        'SO': 'Ordering party',
    },
    RFF: {
        'TN': 'Transaction Reference Number',
        'CT': 'Contract Number',
        'IV': 'Invoice Number',
        'ON': 'Order Number',
        'Z13': 'Marktlokations-ID',
        'Z14': 'Zählpunkt',
    },
    // Add more element codes as needed
};
//# sourceMappingURL=edifact-definitions.js.map