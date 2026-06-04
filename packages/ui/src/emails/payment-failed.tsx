import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface PaymentFailedEmailProps {
  userName: string;
  totalFormatted: string;
  nextRetryDate: string;
  updatePaymentUrl: string;
  isFinalAttempt: boolean;
}

export default function PaymentFailedEmail({
  userName = 'there',
  totalFormatted = '$52.47',
  nextRetryDate = 'Jun 8, 2026',
  updatePaymentUrl = 'https://middleman.app/settings/payment',
  isFinalAttempt = false,
}: PaymentFailedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {isFinalAttempt
          ? 'Action required: your MiddleMan bill is past due'
          : "We couldn't collect your bill — we'll retry"}
      </Preview>
      <Body style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ maxWidth: '480px', margin: '40px auto', padding: '20px' }}>
          <Heading as="h1" style={{ fontSize: '24px', color: '#111827' }}>
            {isFinalAttempt ? 'Payment past due' : 'Payment attempt failed'}
          </Heading>
          <Text>Hey {userName},</Text>
          <Text>
            We tried to collect <strong>{totalFormatted}</strong> but the payment didn't go through.
            {!isFinalAttempt && (
              <>
                {' '}
                We'll automatically retry on <strong>{nextRetryDate}</strong>.
              </>
            )}
          </Text>
          <Text>
            To avoid interruption, please make sure your payment method is up to date:
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Link
              href={updatePaymentUrl}
              style={{
                backgroundColor: isFinalAttempt ? '#dc2626' : '#3b82f6',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Update payment method
            </Link>
          </Section>
          {isFinalAttempt && (
            <Text style={{ color: '#dc2626', fontWeight: 600 }}>
              A late fee of $15.00 has been added to your bill.
            </Text>
          )}
          <Hr />
          <Text style={{ fontSize: '12px', color: '#6b7280' }}>
            MiddleMan Inc. &mdash; One bill, all your subscriptions.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
