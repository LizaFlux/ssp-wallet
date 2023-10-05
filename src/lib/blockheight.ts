import axios from 'axios';
import { getInfoInsight, cryptos } from '../types';

import { backends } from '@storage/backends';

export async function getBlockheight(chain: keyof cryptos): Promise<number> {
  try {
    const backendConfig = backends()[chain];
    const url = `https://${backendConfig.node}/api/status?getinfo`;
    const response = await axios.get<getInfoInsight>(url);

    const currentBlockheight = response.data.info.blocks;
    return currentBlockheight;
  } catch (error) {
    console.log(error);
    throw error;
  }
}
