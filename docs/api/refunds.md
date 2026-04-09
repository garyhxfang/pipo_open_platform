# 退款接口

## 发起退款

- 方法：`POST`
- 路径：`/v1/refunds`

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| out_refund_no | string | 是 | 商户退款单号（需唯一） |
| out_trade_no | string | 是 | 商户订单号 |
| refund_amount | integer | 是 | 退款金额，单位分 |
| reason | string | 否 | 退款原因 |

### 请求示例

```json
{
  "out_refund_no": "RF202603280001",
  "out_trade_no": "ORD202603280001",
  "refund_amount": 100,
  "reason": "用户取消"
}
```

### 响应示例

```json
{
  "code": "SUCCESS",
  "message": "OK",
  "data": {
    "refund_no": "R202603280001",
    "out_refund_no": "RF202603280001",
    "status": "PROCESSING"
  }
}
```
