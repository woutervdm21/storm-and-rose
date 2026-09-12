# Order notification email

Emails the shop when a new order is placed.

## One-time setup

1. **Create a Resend account** at resend.com and make an API key.
   The free tier covers 3,000 emails a month, 100 a day.

2. **Verify a sending domain** in Resend (Domains → Add Domain), then add the
   DNS records it gives you. Until a domain is verified you can only send from
   `onboarding@resend.dev`, which is fine for notifications to your own inbox
   but will not do for customer-facing mail.

   Do **not** try to send *from* a yahoo.com or gmail.com address you do not
   control the DNS for — Yahoo and Gmail publish DMARC rules that tell other
   mail servers to reject it, so it will bounce or land in spam.

3. **Set the secrets:**

   ```
   supabase secrets set RESEND_API_KEY=re_xxxxxxxx
   supabase secrets set ORDER_EMAIL_TO=Stormyvisions@yahoo.com
   supabase secrets set ORDER_EMAIL_FROM="Storm & Rose <orders@stormandrose.co.za>"
   supabase secrets set WEBHOOK_SECRET=<any long random string>
   ```

4. **Deploy:**

   ```
   supabase functions deploy order-notification
   ```

5. **Create the webhook** — see `sql/002_order_notification_webhook.sql`.

## Testing

Place a test order on the site. If no mail arrives, check
Supabase → Edge Functions → order-notification → Logs.
