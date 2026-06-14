import { post } from ".";

export const getServerStatus = async () => post('/system/getServerStatus', {});
export const getLanAddresses = async () => post('/system/getLanAddresses', {});
