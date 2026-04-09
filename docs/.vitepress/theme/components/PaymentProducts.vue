<template>
  <section id="global-acquiring" class="payment-products">
    <header class="payment-products__header">
      <h2>全球收单</h2>
      <p>
        我们围绕企业收单与资金流转场景，提供标准化支付产品组合。你可以按业务阶段逐步接入，
        从线上支付起步，再扩展到代扣、订阅与代发，实现交易增长与运营自动化。
      </p>
    </header>

    <div class="payment-products__grid">
      <article class="product-card">
        <div class="product-card__main">
          <h3>线上支付</h3>
          <p>轻松接收来自网页、H5、App 等多渠道消费者的线上付款。</p>
          <a class="product-card__button" href="/products/online-pay">了解详情</a>
        </div>
      </article>

      <article class="product-card">
        <div class="product-card__main">
          <h3>代扣</h3>
          <p>在用户授权后发起自动扣款，适用于缴费、还款等固定场景。</p>
          <a class="product-card__button" href="/products/withholding">了解详情</a>
        </div>
      </article>

      <article class="product-card">
        <div class="product-card__main">
          <h3>订阅</h3>
          <p>按日、周、月等周期自动扣费，支持续费提醒与订阅状态管理。</p>
          <a class="product-card__button" href="/products/subscription">了解详情</a>
        </div>
      </article>
    </div>
  </section>

  <section id="payment-methods" class="payment-methods-section">
    <header class="payment-methods__header">
      <h2>支付方式</h2>
      <p>
        支持全球包括银行卡，电子钱包，实时付款网络, 网银，银行转账，等100+支付方式，覆盖60+国家及币种。
      </p>
    </header>

    <div class="payment-methods__grid">
      <article class="method-card">Visa</article>
      <article class="method-card">Master</article>
      <article class="method-card">TTPay</article>
      <article class="method-card">Paypal</article>
      <article class="method-card">GoPay</article>
      <article class="method-card">Promptpay</article>
      <article class="method-card">PIX</article>
      <article class="method-card">FPX</article>
      <article class="method-card">TTPL</article>
      <article class="method-card">VA</article>
    </div>

    <div class="payment-methods__footer">
      <a class="methods-button" href="/products/payment-methods">了解全部支付方式</a>
    </div>
  </section>

  <section id="post-payment" class="post-payment-section">
    <header class="post-payment__header">
      <h2>支付后</h2>
    </header>

    <div class="post-payment__grid">
      <article class="post-payment-card">
        <div class="post-payment-card__main">
          <h3>退款</h3>
          <p>支持全额退款、部分退款和退款状态查询，提升售后处理效率。</p>
          <a class="product-card__button" href="/api/refunds">了解详情</a>
        </div>
      </article>
      <article class="post-payment-card">
        <div class="post-payment-card__main">
          <h3>拒付</h3>
          <p>覆盖拒付通知、证据提交与争议处理流程，帮助降低拒付损失。</p>
          <a class="product-card__button" href="/products/chargeback">了解详情</a>
        </div>
      </article>
      <article class="post-payment-card">
        <div class="post-payment-card__main">
          <h3>结算</h3>
          <p>支持按日或按周期结算，提供结算明细、对账与资金状态追踪能力。</p>
          <a class="product-card__button" href="/products/settlement">了解详情</a>
        </div>
      </article>
      <article class="post-payment-card">
        <div class="post-payment-card__main">
          <h3>提现</h3>
          <p>支持商户余额提现到绑定账户，覆盖申请、审核、到账与失败重试流程。</p>
          <a class="product-card__button" href="/products/withdrawal">了解详情</a>
        </div>
      </article>
    </div>
  </section>

  <section id="global-payout" class="payout-section">
    <header class="payout-section__header">
      <h2>全球代发</h2>
      <p>向个人或企业账户批量发起付款，覆盖佣金发放、商户结算和活动补贴等场景。</p>
    </header>

    <div class="payout-products__grid">
      <article class="product-card">
        <div class="product-card__main">
          <h3>单笔代发</h3>
          <p>面向低频付款场景，支持单笔发起、状态追踪与失败重试。</p>
          <a class="product-card__button" href="/products/payout">了解详情</a>
        </div>
      </article>

      <article class="product-card">
        <div class="product-card__main">
          <h3>批量代发</h3>
          <p>面向高频发放场景，支持批量文件上传、批次查询与结果回执。</p>
          <a class="product-card__button" href="/products/payout">了解详情</a>
        </div>
      </article>
    </div>
  </section>

  <section id="platform-payment" class="platform-payment-section">
    <header class="platform-payment__header">
      <h2>平台支付</h2>
    </header>

    <div class="platform-payment__grid">
      <article class="product-card">
        <div class="product-card__main">
          <h3>合单支付</h3>
          <p>支持多笔订单合并支付，统一收银并提升支付转化效率。</p>
          <a class="product-card__button" href="/products/combined-payment">了解详情</a>
        </div>
      </article>

      <article class="product-card">
        <div class="product-card__main">
          <h3>分账</h3>
          <p>支持按规则自动分账给多个参与方，满足平台型业务结算场景。</p>
          <a class="product-card__button" href="/products/split-billing">了解详情</a>
        </div>
      </article>

      <article class="product-card">
        <div class="product-card__main">
          <h3>商户转账</h3>
          <p>支持商户账户间资金划转，覆盖补款、调账和内部清算需求。</p>
          <a class="product-card__button" href="/products/merchant-transfer">了解详情</a>
        </div>
      </article>

      <article class="product-card">
        <div class="product-card__main">
          <h3>基本户支付</h3>
          <p>支持通过企业基本户完成对公付款，适配合规资金支付场景。</p>
          <a class="product-card__button" href="/products/basic-account-payment">了解详情</a>
        </div>
      </article>
    </div>
  </section>
</template>
