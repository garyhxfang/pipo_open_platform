# 支付下单

## 创建支付

- 方法：`POST`
- 路径：`/v1/payments`

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| out_trade_no | string | 是 | 商户订单号（需唯一） |
| amount | integer | 是 | 支付金额，单位分 |
| currency | string | 是 | 币种，默认 `CNY` |
| subject | string | 是 | 订单标题 |
| notify_url | string | 是 | 支付结果回调地址 |

### 请求示例

```json
{
  "out_trade_no": "ORD202603280001",
  "amount": 100,
  "currency": "CNY",
  "subject": "咖啡订单",
  "notify_url": "https://merchant.example.com/webhook/payment"
}
```

### 响应示例

```json
{
  "code": "SUCCESS",
  "message": "OK",
  "data": {
    "trade_no": "T202603280001",
    "out_trade_no": "ORD202603280001",
    "status": "PENDING",
    "pay_url": "https://cashier.examplepay.com/pay/T202603280001"
  }
}
```

## 查询支付

- 方法：`GET`
- 路径：`/v1/payments/{out_trade_no}`
