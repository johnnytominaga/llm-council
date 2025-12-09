# Email Authentication System

Complete email verification and password reset functionality using AhaSend email service.

## Features Implemented

✅ **Email Verification**
- Users must verify email before signing in
- Verification link sent automatically on signup
- Beautiful HTML email templates
- 24-hour link expiration

✅ **Password Reset**
- Forgot password flow
- Secure reset tokens
- 1-hour link expiration
- Password strength validation

✅ **User Experience**
- Toast notifications for all actions
- Clear success/error states
- Loading indicators
- Mobile-responsive design

## Configuration

### Environment Variables

Add these to your `.env.local`:

```bash
# AhaSend Email Service (Required)
AHASEND_API_KEY=your_ahasend_api_key_here
EMAIL_FROM_DOMAIN=authmail.kilonovaventures.com
EMAIL_FROM_NAME=Kilonova LLM Council

# App URL (Required for email links)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your production domain
```

### AhaSend Setup

1. Create account at https://ahasend.com
2. Verify your sending domain (`authmail.kilonovaventures.com`)
3. Add DNS records as instructed by AhaSend
4. Copy your API key to `.env.local`

## File Structure

```
lib/
  ├── email.ts              # Email sender and templates
  └── auth.ts               # BetterAuth config with email verification

app/auth/
  ├── page.tsx              # Main auth page (signin/signup)
  ├── forgot-password/
  │   └── page.tsx          # Request password reset
  ├── reset-password/
  │   └── page.tsx          # Set new password
  └── verify-email/
      └── page.tsx          # Email verification confirmation

components/
  └── AuthForm.tsx          # Updated with verification flow
```

## User Flows

### Sign Up Flow

1. User fills out signup form (name, email, password)
2. Account created, verification email sent via AhaSend
3. User sees "Check your email" message
4. User clicks verification link in email
5. Redirected to `/auth/verify-email?token=...`
6. Email verified, redirected to signin
7. User signs in with credentials
8. Redirected to app home page

### Password Reset Flow

1. User clicks "Forgot your password?" on signin page
2. Enters email address
3. Reset email sent via AhaSend
4. User clicks reset link in email
5. Redirected to `/auth/reset-password?token=...`
6. User enters new password (min 8 chars)
7. Password updated, redirected to signin
8. User signs in with new password

## Email Templates

### Verification Email

**Subject:** Verify your email address

**Design:**
- Purple gradient header
- Clear "Verify Email Address" button
- Fallback plain text link
- 24-hour expiration notice
- Professional footer

**Preview:**
```html
┌─────────────────────────┐
│  VERIFY YOUR EMAIL      │ (Purple gradient)
├─────────────────────────┤
│ Please verify your      │
│ email by clicking:      │
│                         │
│  [Verify Email]         │ (Blue button)
│                         │
│ Or copy this link:      │
│ https://...             │
│                         │
│ Expires in 24 hours     │
└─────────────────────────┘
```

### Password Reset Email

**Subject:** Reset your password

**Design:**
- Orange/red gradient header
- Clear "Reset Password" button
- Security warning box
- 1-hour expiration notice
- Professional footer

**Preview:**
```html
┌─────────────────────────┐
│  RESET YOUR PASSWORD    │ (Orange gradient)
├─────────────────────────┤
│ Click to reset:         │
│                         │
│  [Reset Password]       │ (Red button)
│                         │
│ ⚠️  Security Notice:    │
│ Link expires in 1 hour  │
│ Didn't request this?    │
│ Ignore this email       │
└─────────────────────────┘
```

## Security Features

### Email Verification

- **Token expiration:** 24 hours
- **One-time use:** Tokens invalidated after use
- **Account disabled:** Cannot sign in without verification
- **Rate limiting:** Built into BetterAuth

### Password Reset

- **Token expiration:** 1 hour
- **One-time use:** Tokens invalidated after use
- **Password strength:** Minimum 8 characters
- **Confirmation:** Must enter password twice
- **Old password:** Not accessible after reset

## Code Examples

### Sending Verification Email

```typescript
import { sendVerificationEmail } from '@/lib/email';

await sendVerificationEmail(
  'user@example.com',
  'https://yourapp.com/auth/verify-email?token=abc123'
);
```

### Sending Password Reset Email

```typescript
import { sendPasswordResetEmail } from '@/lib/email';

await sendPasswordResetEmail(
  'user@example.com',
  'https://yourapp.com/auth/reset-password?token=abc123'
);
```

### Custom Email Template

```typescript
import { sendEmail } from '@/lib/email';

await sendEmail({
  to: 'user@example.com',
  subject: 'Welcome to LLM Council',
  html: '<h1>Welcome!</h1><p>Thanks for joining.</p>',
  text: 'Welcome! Thanks for joining.', // Optional fallback
});
```

## Testing Locally

### 1. Start Dev Server

```bash
npm run dev
```

### 2. Sign Up

1. Navigate to http://localhost:3000
2. You'll be redirected to `/auth`
3. Click "Don't have an account? Sign up"
4. Fill out form and submit

### 3. Check Email

- Check the email inbox for your test account
- Look for email from `noreply@authmail.kilonovaventures.com`
- Click the verification link

### 4. Verify Account

- You'll be redirected to `/auth/verify-email?token=...`
- Should see "Email verified successfully!"
- Auto-redirected to signin page

### 5. Sign In

- Enter your credentials
- Should be able to sign in successfully

### 6. Test Password Reset

1. Click "Forgot your password?"
2. Enter email and submit
3. Check email for reset link
4. Click link, enter new password
5. Sign in with new password

## Troubleshooting

### Email Not Received

**Check:**
1. AhaSend API key is correct in `.env.local`
2. Sending domain is verified in AhaSend dashboard
3. Check spam folder
4. Verify email address is correct
5. Check AhaSend logs for delivery status

**Debug:**
```bash
# Check server logs for email sending errors
npm run dev
# Look for "[Better Auth]" logs
```

### Verification Link Invalid

**Common causes:**
1. Token expired (24 hours for verification, 1 hour for reset)
2. Token already used
3. User deleted from database
4. Wrong `NEXT_PUBLIC_APP_URL` in `.env.local`

**Solution:**
- Request new verification email
- Check database for existing verification records
- Ensure URL matches your actual domain

### 401 Unauthorized on Signin

**After email verification:**
- This means email is not yet verified in database
- Check `user` table, `emailVerified` should be `true`
- Try clicking verification link again

### AhaSend API Errors

**500 Server Error:**
```typescript
// Check lib/email.ts console logs
console.error('AhaSend API error:', error);
```

**Common fixes:**
1. Verify API key is valid
2. Check domain is verified
3. Ensure sender domain matches verified domain
4. Review AhaSend rate limits

## Production Deployment

### Pre-Deployment Checklist

- [ ] `AHASEND_API_KEY` added to Vercel environment variables
- [ ] `EMAIL_FROM_DOMAIN` set to production domain
- [ ] `NEXT_PUBLIC_APP_URL` set to production URL (https://...)
- [ ] Sending domain verified in AhaSend
- [ ] DNS records configured correctly
- [ ] Test email sending from production
- [ ] Verify email templates render correctly
- [ ] Test complete signup + verification flow
- [ ] Test password reset flow

### Vercel Environment Variables

```bash
AHASEND_API_KEY=your_production_api_key
EMAIL_FROM_DOMAIN=authmail.kilonovaventures.com
EMAIL_FROM_NAME=Kilonova LLM Council
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
```

### DNS Configuration

For `authmail.kilonovaventures.com`:

**SPF Record:**
```
v=spf1 include:_spf.ahasend.com ~all
```

**DKIM Record:**
```
(Provided by AhaSend dashboard)
```

**DMARC Record:**
```
v=DMARC1; p=none; rua=mailto:dmarc@kilonovaventures.com
```

## Monitoring

### Email Delivery

**AhaSend Dashboard:**
- View sent emails
- Check delivery rates
- Monitor bounce rates
- Track open rates

### User Verification Rate

```sql
-- Check verification rate
SELECT
  COUNT(*) as total_users,
  SUM(CASE WHEN emailVerified = 1 THEN 1 ELSE 0 END) as verified,
  ROUND(SUM(CASE WHEN emailVerified = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as verification_rate
FROM user;
```

### Password Reset Usage

```sql
-- Check recent password resets
SELECT COUNT(*) as reset_count
FROM verification
WHERE identifier LIKE '%reset%'
AND createdAt > datetime('now', '-7 days');
```

## Customization

### Change Email Design

Edit templates in `lib/email.ts`:

```typescript
export async function sendVerificationEmail(email: string, verificationUrl: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <!-- Your custom HTML here -->
    </html>
  `;

  return sendEmail({ to: email, subject: 'Verify your email', html });
}
```

### Change Token Expiration

BetterAuth config in `lib/auth.ts`:

```typescript
emailVerification: {
  expirationTime: 60 * 60 * 48, // 48 hours (default is 24)
}
```

### Add Email Templates

Create new functions in `lib/email.ts`:

```typescript
export async function sendWelcomeEmail(email: string, name: string) {
  const html = `
    <h1>Welcome ${name}!</h1>
    <p>Your account is now active.</p>
  `;

  return sendEmail({ to: email, subject: 'Welcome!', html });
}
```

## Best Practices

### Email Deliverability

1. **Use professional templates:** HTML emails should have proper structure
2. **Include plain text:** Fallback for email clients that don't support HTML
3. **Verify sender domain:** DKIM, SPF, and DMARC records must be configured
4. **Monitor bounce rates:** High bounce rates harm sender reputation
5. **Respect unsubscribes:** Include unsubscribe link if sending marketing emails

### Security

1. **HTTPS only:** Never send auth links over HTTP in production
2. **Short expiration:** Keep token lifetimes short (1-24 hours)
3. **Rate limiting:** Prevent email bombing attacks
4. **Log attempts:** Track failed verification/reset attempts
5. **User notification:** Alert users when password is changed

### User Experience

1. **Clear instructions:** Tell users what to do next
2. **Visual feedback:** Loading states, success messages, error handling
3. **Mobile-friendly:** Test on different screen sizes
4. **Accessibility:** Use semantic HTML and ARIA labels
5. **Error messages:** Helpful, specific, actionable

## FAQ

**Q: Can users sign in without verifying email?**
A: No, `requireEmailVerification: true` blocks signin until verified.

**Q: How do I resend verification email?**
A: BetterAuth provides a resend endpoint at `/api/auth/send-verification-email`.

**Q: Can I use a different email provider?**
A: Yes! Replace AhaSend API calls in `lib/email.ts` with any provider (SendGrid, Mailgun, AWS SES, etc.).

**Q: Do verification links work after password reset?**
A: Password reset doesn't invalidate email verification. Once verified, stays verified.

**Q: Can I customize email sender name?**
A: Yes, change `EMAIL_FROM_NAME` in `.env.local`.

**Q: What happens to unverified accounts?**
A: They remain in database but cannot sign in. Consider cleaning up old unverified accounts periodically.

## Support

- **AhaSend Docs:** https://docs.ahasend.com
- **BetterAuth Docs:** https://www.better-auth.com/docs
- **Email Testing:** https://ethereal.email (for development)

---

**Email authentication system ready!** 📧✨
