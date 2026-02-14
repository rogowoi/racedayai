# Email Verification Implementation Plan

## Overview
Implement email verification for new user signups to ensure valid email addresses and reduce spam/fake accounts. This addresses bug N2 from the QA review.

---

## Current State Analysis

### Existing Auth System
- **Framework**: NextAuth v5 (Auth.js)
- **Providers**:
  - Credentials (email/password)
  - OAuth (Strava)
- **Database**: Prisma + PostgreSQL (Neon)
- **Email Service**: Resend (already configured)

### User Model (from Prisma schema)
```prisma
model User {
  id                      String    @id @default(cuid())
  email                   String    @unique
  emailVerified           DateTime? // Already exists in schema!
  name                    String?
  password                String?   // For credentials login
  image                   String?
  plan                    String    @default("free")
  stripeCustomerId        String?   @unique
  stripeSubscriptionId    String?   @unique
  plansCreatedThisSeason  Int       @default(0)
  seasonStartDate         DateTime?
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  // ... relations
}
```

**Key Findings**:
- ✅ `emailVerified` field already exists in User model
- ✅ Resend email service already configured
- ✅ NextAuth v5 supports email verification out of the box
- ❌ Verification tokens table might need to be added
- ❌ Email templates need to be created
- ❌ Verification flow needs to be implemented

---

## Requirements

### Functional Requirements
1. **Signup Flow**:
   - User signs up with email/password
   - System sends verification email immediately
   - User cannot access protected features until verified
   - Show "verify your email" banner/message on dashboard

2. **Verification Email**:
   - Branded email with RaceDayAI logo/styling
   - Clear call-to-action button
   - Verification link expires after 24 hours
   - Includes "resend verification" link

3. **Verification Process**:
   - User clicks link in email
   - Token is validated (not expired, not used)
   - User's `emailVerified` timestamp is set
   - Redirect to success page or dashboard
   - Show success message

4. **Edge Cases**:
   - Resend verification email (if user didn't receive it)
   - Handle already-verified users gracefully
   - Handle expired tokens with option to resend
   - OAuth users (Strava) are auto-verified

### Non-Functional Requirements
- Secure token generation (cryptographically random)
- Email delivery reliability (using Resend's API)
- Clear error messages for users
- Mobile-responsive email templates
- Rate limiting on verification email sends (prevent abuse)

---

## Technical Design

### 1. Database Schema Changes

**Add VerificationToken model** (or use existing if Auth.js provides):

```prisma
model VerificationToken {
  identifier String   // email address
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@index([identifier])
}
```

**Migration needed**: `pnpm prisma migrate dev --name add_verification_tokens`

### 2. Email Service Setup

**Create verification email template** (`apps/web/src/lib/emails/verification.tsx`):

```tsx
export const VerificationEmail = ({
  verificationUrl,
  userName,
}: {
  verificationUrl: string;
  userName?: string;
}) => (
  <Html>
    <Head />
    <Body>
      <Container>
        <Heading>Verify your RaceDayAI account</Heading>
        <Text>Hi {userName || 'there'},</Text>
        <Text>
          Click the button below to verify your email address and complete your registration.
        </Text>
        <Button href={verificationUrl}>
          Verify Email Address
        </Button>
        <Text>
          Or copy and paste this link: {verificationUrl}
        </Text>
        <Text>This link expires in 24 hours.</Text>
      </Container>
    </Body>
  </Html>
);
```

**Email sending function** (`apps/web/src/lib/emails/send.ts`):

```typescript
import { Resend } from 'resend';
import { VerificationEmail } from './verification';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(
  email: string,
  token: string,
  userName?: string
) {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`;

  await resend.emails.send({
    from: 'RaceDayAI <noreply@racedayai.com>',
    to: email,
    subject: 'Verify your RaceDayAI account',
    react: VerificationEmail({ verificationUrl, userName }),
  });
}
```

### 3. API Endpoints

**a) Verification Token Generation** (integrated into signup flow)

Location: `apps/web/src/app/api/auth/[...nextauth]/route.ts` or signup handler

```typescript
import { randomBytes } from 'crypto';

async function generateVerificationToken(email: string) {
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Delete any existing tokens for this email
  await prisma.verificationToken.deleteMany({
    where: { identifier: email },
  });

  // Create new token
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  });

  return token;
}
```

**b) Email Verification Endpoint**

File: `apps/web/src/app/api/auth/verify-email/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect('/signup?error=invalid-token');
  }

  try {
    // Find the token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.redirect('/signup?error=invalid-token');
    }

    // Check if expired
    if (verificationToken.expires < new Date()) {
      await prisma.verificationToken.delete({
        where: { token },
      });
      return NextResponse.redirect('/signup?error=token-expired');
    }

    // Update user's emailVerified timestamp
    await prisma.user.update({
      where: { email: verificationToken.identifier },
      data: { emailVerified: new Date() },
    });

    // Delete the token
    await prisma.verificationToken.delete({
      where: { token },
    });

    return NextResponse.redirect('/dashboard?verified=true');
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.redirect('/signup?error=verification-failed');
  }
}
```

**c) Resend Verification Email Endpoint**

File: `apps/web/src/app/api/auth/resend-verification/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { sendVerificationEmail } from '@/lib/emails/send';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  // Check if already verified
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (user?.emailVerified) {
    return NextResponse.json(
      { error: 'Email already verified' },
      { status: 400 }
    );
  }

  // Rate limiting check (e.g., only allow resend every 5 minutes)
  const recentToken = await prisma.verificationToken.findFirst({
    where: {
      identifier: session.user.email,
      expires: { gt: new Date(Date.now() - 5 * 60 * 1000) },
    },
  });

  if (recentToken) {
    return NextResponse.json(
      { error: 'Please wait before requesting another verification email' },
      { status: 429 }
    );
  }

  // Generate new token
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.verificationToken.deleteMany({
    where: { identifier: session.user.email },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: session.user.email,
      token,
      expires,
    },
  });

  // Send email
  await sendVerificationEmail(session.user.email, token, user?.name || undefined);

  return NextResponse.json({ success: true });
}
```

### 4. UI Components

**a) Unverified Email Banner**

File: `apps/web/src/components/auth/unverified-banner.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Mail, Loader2 } from 'lucide-react';

export function UnverifiedEmailBanner({ email }: { email: string }) {
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleResend = async () => {
    setIsResending(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
      });

      if (res.ok) {
        setMessage('Verification email sent! Check your inbox.');
      } else {
        const data = await res.json();
        setMessage(data.error || 'Failed to send email');
      }
    } catch (error) {
      setMessage('Something went wrong. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-amber-900 dark:text-amber-100">
            Verify your email address
          </h3>
          <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
            We sent a verification link to <strong>{email}</strong>. Please check your inbox and click the link to verify your account.
          </p>
          {message && (
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
              {message}
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={handleResend}
            disabled={isResending}
          >
            {isResending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Resend Verification Email
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**b) Integrate Banner into Dashboard**

Update `apps/web/src/app/dashboard/page.tsx`:

```tsx
import { UnverifiedEmailBanner } from '@/components/auth/unverified-banner';

export default async function DashboardPage() {
  const session = await auth();
  // ... existing code

  const user = await getDashboardData(session.user.id);
  const isEmailVerified = !!user?.emailVerified;

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Show banner if email not verified */}
          {!isEmailVerified && user?.email && (
            <UnverifiedEmailBanner email={user.email} />
          )}

          {/* Rest of dashboard content */}
          {/* ... */}
        </div>
      </main>
    </div>
  );
}
```

### 5. Signup Flow Integration

Update `apps/web/src/app/signup/page.tsx` action handler:

```typescript
async function handleSignup(formData: FormData) {
  'use server';

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string;

  // Hash password
  const hashedPassword = await hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      emailVerified: null, // NOT verified yet
    },
  });

  // Generate verification token
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  });

  // Send verification email
  await sendVerificationEmail(email, token, name);

  // Sign the user in (even though unverified)
  await signIn('credentials', {
    email,
    password,
    redirect: true,
    redirectTo: '/dashboard',
  });
}
```

### 6. Middleware / Route Protection

**Option A**: Block unverified users from wizard

Update `apps/web/src/app/wizard/page.tsx`:

```tsx
export default function WizardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user?.emailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-lg">
          <CardContent className="pt-6 space-y-4">
            <AlertCircle className="h-12 w-12 text-amber-600 mx-auto" />
            <h2 className="text-xl font-bold text-center">Email Verification Required</h2>
            <p className="text-center text-muted-foreground">
              Please verify your email address before creating a race plan.
            </p>
            <Button asChild className="w-full">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ... rest of wizard
}
```

**Option B**: Allow unverified users but show warning (softer approach)

---

## Implementation Checklist

### Phase 1: Database & Infrastructure
- [ ] Check if VerificationToken table exists in Prisma schema
- [ ] Add VerificationToken model if missing
- [ ] Run Prisma migration: `pnpm prisma migrate dev --name add_verification_tokens`
- [ ] Verify Resend API key is configured in `.env`
- [ ] Test Resend email sending in development

### Phase 2: Email Templates
- [ ] Install React Email library: `pnpm add @react-email/components`
- [ ] Create verification email template (`src/lib/emails/verification.tsx`)
- [ ] Create email sending utility (`src/lib/emails/send.ts`)
- [ ] Test email rendering locally with React Email dev server

### Phase 3: API Endpoints
- [ ] Create `/api/auth/verify-email/route.ts` (GET handler)
- [ ] Create `/api/auth/resend-verification/route.ts` (POST handler)
- [ ] Add verification token generation to signup flow
- [ ] Test token generation, validation, and expiration
- [ ] Add rate limiting to resend endpoint

### Phase 4: UI Components
- [ ] Create `UnverifiedEmailBanner` component
- [ ] Integrate banner into dashboard page
- [ ] Add verification success message to dashboard
- [ ] Handle verification errors (expired, invalid, already verified)
- [ ] Test UI flows in browser

### Phase 5: Signup Integration
- [ ] Update signup handler to generate and send verification email
- [ ] Update signup page to show "check your email" message
- [ ] Ensure OAuth users (Strava) bypass verification (auto-set emailVerified)
- [ ] Test full signup → email → verify → dashboard flow

### Phase 6: Edge Cases & Polish
- [ ] Handle already-verified users clicking verification link
- [ ] Handle expired token with helpful error message
- [ ] Add resend button to error states
- [ ] Test rate limiting on resend
- [ ] Add loading states to all buttons
- [ ] Test mobile responsive email templates
- [ ] Add analytics tracking for verification events

### Phase 7: Documentation & Deployment
- [ ] Document email verification flow in README
- [ ] Add environment variables to Vercel (if not already set)
- [ ] Test in staging/preview deployment
- [ ] Deploy to production
- [ ] Monitor email delivery rates in Resend dashboard

---

## Environment Variables Needed

```bash
# Should already exist
RESEND_API_KEY=re_xxxxx
NEXTAUTH_URL=https://racedayai.com
NEXTAUTH_SECRET=xxxxx

# Email sender domain (must be verified in Resend)
FROM_EMAIL=noreply@racedayai.com
```

---

## Testing Strategy

### Manual Testing
1. Sign up with new email
2. Check inbox for verification email
3. Click verification link → verify success
4. Try to verify again → show "already verified"
5. Request new signup → get new email
6. Wait 24h → link expires → show expired message
7. Click "Resend" → get new email
8. Sign up with Strava → auto-verified (no email needed)

### Edge Cases to Test
- Multiple verification requests rapidly (rate limiting)
- Invalid token in URL
- Malformed token
- Already verified user accessing verification page
- Concurrent verification attempts
- User signs up, deletes account, signs up again with same email

---

## Security Considerations

1. **Token Security**:
   - Use cryptographically random tokens (`crypto.randomBytes`)
   - Store hashed version if paranoid (current plan stores plaintext - acceptable for short-lived tokens)
   - Tokens expire after 24 hours
   - Tokens are single-use (deleted after verification)

2. **Rate Limiting**:
   - Limit resend requests to 1 per 5 minutes per email
   - Consider IP-based rate limiting for signup endpoint
   - Use Vercel's rate limiting middleware if available

3. **Email Validation**:
   - Validate email format before sending
   - Check for disposable email domains (optional)
   - Use DNS verification to ensure domain exists

4. **Privacy**:
   - Don't reveal if email exists in system (prevent enumeration)
   - Use consistent error messages
   - Don't expose user data in verification URLs

---

## Rollout Strategy

### Option 1: Hard Launch (Recommended)
- Deploy all at once
- All new signups require verification
- Existing users without `emailVerified` see banner
- Send one-time email to all unverified users

### Option 2: Soft Launch
- Deploy verification system
- Make verification optional initially (show banner but don't block)
- After 1-2 weeks, enforce verification for new signups
- Gradually enforce for existing users

### Option 3: Gradual Rollout
- Enable for % of new signups (feature flag)
- Monitor email delivery and user friction
- Gradually increase % until 100%

**Recommendation**: Option 1 (Hard Launch) - the system is simple enough that soft rollout adds unnecessary complexity.

---

## Success Metrics

- **Email Delivery Rate**: >95% successful delivery
- **Verification Rate**: >80% of users verify within 24 hours
- **Bounce Rate**: <5% email bounces
- **Support Tickets**: Monitor increase in verification-related support requests
- **Signup Abandonment**: Ensure <10% drop-off due to verification step

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Email delivery failures | High | Use Resend's reliable infrastructure, monitor delivery rates |
| Users don't check email | Medium | Clear messaging, easy resend button |
| Spam folder issues | Medium | Proper SPF/DKIM/DMARC setup, "from" address reputation |
| Token expiration confusion | Low | Clear expiration message, easy resend |
| Rate limiting too strict | Low | Allow 1 resend per 5 min (generous) |
| Increased support load | Medium | Clear documentation, FAQ, helpful error messages |

---

## Future Enhancements (Post-MVP)

1. **Email Change Verification**: Require verification when user changes email
2. **Magic Link Login**: Use same token system for passwordless auth
3. **Email Preferences**: Allow users to manage notification settings
4. **Verification Reminders**: Send reminder email after 3 days if not verified
5. **Alternative Verification**: Phone/SMS verification option
6. **Admin Panel**: View unverified users, resend emails manually
7. **Analytics Dashboard**: Track verification funnel metrics

---

## Estimated Effort

- **Development**: 6-8 hours
  - Database/API setup: 2 hours
  - Email templates: 1 hour
  - UI components: 2 hours
  - Integration & testing: 2-3 hours

- **Testing**: 2-3 hours
  - Manual testing: 1 hour
  - Edge case testing: 1 hour
  - Production smoke test: 1 hour

- **Total**: 8-11 hours

---

## Dependencies

- ✅ Resend account with verified domain
- ✅ Prisma schema with `emailVerified` field (already exists)
- ✅ NextAuth v5 configured
- ❌ React Email library (needs install)
- ❌ VerificationToken table (needs migration)

---

## Notes

- OAuth users (Strava) should have `emailVerified` set automatically on signup
- Consider adding "I didn't receive an email" help text with resend button
- Email templates should be mobile-responsive (use React Email components)
- Monitor Resend dashboard for delivery issues
- Consider A/B testing different email subject lines for open rates
