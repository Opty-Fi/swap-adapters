export type eNetwork = eEthereumNetwork | ePolygonNetwork;

export enum eEthereumNetwork {
  main = "main",
}

export enum ePolygonNetwork {
  polygon = "polygon",
}

export enum EthereumNetworkNames {
  main = "main",
  kovan = "kovan",
  ropsten = "ropsten",
  goerli = "goerli",
  rinkeby = "rinkeby",
  matic = "matic",
  mumbai = "mumbai",
  xdai = "xdai",
  avalanche = "avalanche",
  fuji = "fuji",
  arbitrum1 = "arbitrum1",
  rinkeby_arbitrum1 = "rinkeby_arbitrum1",
  fantom = "fantom",
  fantom_test = "fantom_test",
  bsc = "bsc",
  bsc_test = "bsc_test",
  oethereum = "oethereum",
  kovan_oethereum = "kovan_oethereum",
  goerli_oethereum = "goerli_oethereum",
}

export type iParamsPerNetwork<T> = {
  [key in eNetwork]: T;
};

export interface iParamsPerNetworkAll<T> extends iEthereumParamsPerNetwork<T>, iPolygonParamsPerNetwork<T> {}

export interface iEthereumParamsPerNetwork<T> {
  [eEthereumNetwork.main]: T;
}

export interface iPolygonParamsPerNetwork<T> {
  [ePolygonNetwork.polygon]: T;
}
