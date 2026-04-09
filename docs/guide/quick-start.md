# 快速开始

本章节演示商户从 0 到 1 完成首笔支付的最短路径。

## 前置准备

1. 完成商户入驻并获取 `merchant_id`
2. 在开放平台控制台创建应用并获取 `app_id`
3. 配置 API 密钥（`api_key`）与 RSA 私钥
4. 获取沙箱网关地址：`https://sandbox-api.examplepay.com`

## 第一步：生成签名

签名算法建议使用 `RSA-SHA256`。

签名串示例：

```text
app_id=app_123456&merchant_id=mch_10001&out_trade_no=ORD202603280001&amount=100&currency=CNY&timestamp=2026-03-28T10:00:00+08:00
```

## 第二步：发起支付下单

```bash
curl -X POST 'https://sandbox-api.examplepay.com/v1/payments' \
  -H 'Content-Type: application/json' \
  -H 'X-App-Id: app_123456' \
  -H 'X-Merchant-Id: mch_10001' \
  -H 'X-Timestamp: 2026-03-28T10:00:00+08:00' \
  -H 'X-Signature: <SIGNATURE>' \
  -d '{
    "out_trade_no": "ORD202603280001",
    "amount": 100,
    "currency": "CNY",
    "subject": "咖啡订单",
    "notify_url": "https://merchant.example.com/webhook/payment"
  }'
```

## 第三步：处理回调

交易状态变更后，平台将向 `notify_url` 推送 `payment.succeeded` 事件。

## 第四步：查询交易

如果未收到回调或状态不明确，调用查询接口进行兜底确认。
