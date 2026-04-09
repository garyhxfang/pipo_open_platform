# 错误码与 FAQ

## 常见错误码

| 错误码 | 含义 | 处理建议 |
| --- | --- | --- |
| INVALID_SIGNATURE | 签名错误 | 检查签名串与私钥是否匹配 |
| REQUEST_EXPIRED | 请求过期 | 校准服务器时间，控制在 5 分钟内 |
| DUPLICATE_OUT_TRADE_NO | 订单号重复 | 保证 `out_trade_no` 唯一且幂等 |
| INSUFFICIENT_BALANCE | 余额不足 | 提示换卡或稍后重试 |
| SYSTEM_ERROR | 系统繁忙 | 使用指数退避重试 |

## FAQ

### Q1：支付成功但商户系统未更新状态？

1. 优先检查 Webhook 接口是否返回 `200`
2. 使用查询接口做补偿
3. 检查是否做了 `event_id` 幂等去重

### Q2：如何从沙箱切到生产？

1. 更换网关域名
2. 替换生产密钥和证书
3. 执行上线检查清单并完成回归测试
