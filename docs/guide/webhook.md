# Webhook 回调

## 回调说明

平台会在支付结果、退款结果等状态变更时发送事件通知。

- 方法：`POST`
- Content-Type：`application/json`
- 重试策略：指数退避，最长 24 小时

## 事件示例

```json
{
  "event_id": "evt_202603280001",
  "event_type": "payment.succeeded",
  "occurred_at": "2026-03-28T10:05:00+08:00",
  "data": {
    "merchant_id": "mch_10001",
    "trade_no": "T202603280001",
    "out_trade_no": "ORD202603280001",
    "amount": 100,
    "status": "SUCCEEDED"
  }
}
```

## 接收端要求

1. 必须校验签名
2. 必须实现幂等（按 `event_id` 去重）
3. 处理成功后返回 `200 OK`
4. 超时或非 2xx 响应会触发重试
