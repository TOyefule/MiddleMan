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

interface BillMarkedPastDueEmailProps {
  userName: string;
  daysOverdue: number;
  totalAmount: string;
  reason: string;
  viewBillUrl: string;
}

export default function BillMarkedPastDueEmail({
  userName = 'there',
  daysOverdue = 7,
  totalAmount = '$52.47',
  reason = 'Payment attempt failed',
  viewBillUrl = 'https://middleman.app/bills',
}: BillMarkedPastDueEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your MiddleMan bill is now past due</Preview>
      <Body style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ maxWidth: '480px', margin: '40px auto', padding: '20px' }}>
          <Heading as="h1" style={{ fontSize: '24px', color: '#dc2626' }}>
            Action needed: Bill past due
          </Heading>
          <Text>Hey {userName},</Text>
          <Text>
            Your MiddleMan bill of <strong>{totalAmount}</strong> is now past due by{' '}
            <strong>{daysOverdue} day{daysOverdue !== 1 ? 's' : ''}</strong>.
          </Text>
          <Text style={{ color: '#4b5563' }}>
            <strong>What happened:</strong> {reason}
          </Text>
          <Section
            style={{
              backgroundColor: '#fee2e2',
              padding: '16px',
              borderRadius: '6px',
              marginY: '20px',
              borderLeft: '4px solid #dc2626',
            }}
          >
            <Text style={{ margin: '8px 0', fontWeight: 600 }}>Please pay as soon as possible.</Text>
            <Text style={{ margin: '8px 0', color: '#4b5563', fontSize: '14px' }}>
              If payment remains unpaid, your account may be escalated for further action.
            </Text>
          </Section>
          <Text>
            To resolve this, please update your payment method or contact our support team for
            assistance.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Link
              href={viewBillUrl}
              style={{
                backgroundColor: '#dc2626',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Pay now
            </Link>
          </Section>
          <Hr />
          <Text style={{ fontSize: '12px', color: '#6b7280' }}>
            MiddleMan Inc. &mdash; One bill, all your subscriptions.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
