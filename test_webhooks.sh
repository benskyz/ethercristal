echo
echo
echo "===== TEST SHOP ====="
curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "x-webhook-secret: $PAYMENT_WEBHOOK_SECRET" \
  -d "{
    \"paymentId\": \"$SHOP_PAYMENT_ID\",
    \"eventType\": \"payment.completed\",
    \"eventStatus\": \"paid\",
    \"provider\": \"manual\",
    \"providerEventId\": \"evt_support_shop_003_test4\",
    \"providerPaymentId\": \"pay_support_shop_003_test4\",
    \"rawPayload\": {
      \"source\": \"termux-test-shop-retry-2\"
    }
  }"
