export {
    DepthStd,
    Side,
    OrderType
}

enum DepthStd {
  Direct,
  Indirect,
}

enum Side {
  Buy = "buy",
  Sell = "sell",
}

enum OrderType {
  Limit = "limit",
  IOC = "ioc",
  PostOnly = "postOnly",
}