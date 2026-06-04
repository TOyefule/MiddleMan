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

interface UncollectibleClearedEmailProps {
  userName: string;
  totalAmount: string;
  reason: string;
  viewBillUrl: string;
}

export default function UncollectibleClearedEmail({
  userName = 'there',
  totalAmount = '$62.47',
  reason = 'Status cleared for retry',
  viewBillUrl = 'https://middleman.app/bills',
}: UncollectibleClearedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Another chance to pay your MiddleMan bill</Preview>
      <Body style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ maxWidth: '480px', margin: '40px auto', padding: '20px' }}>
          <Heading as="h1" style={{ fontSize: '24px', color: '#111827' }}>
            Let's try again
          </Heading>
          <Text>Hey {userName},</Text>
          <Text>
            We're giving your MiddleMan bill of <strong>{totalAmount}</strong> another shot. We'll
            attempt to collect it again shortly.
          </Text>
          <Text style={{ color: '#4b5563' }}>
            <strong>Status:</strong> {reason}
          </Text>
          <Section
            style={{
              backgroundColor: '#e0f2fe',
              padding: '16px',
              borderRadius: '6px',
              marginY: '20px',
              borderLeft: '4px solid #0284c7',
            }}
          >
            <Text style={{ margin: '8px 0', fontWeight: 600 }}>What you should do:</Text>
            <Text style={{ margin: '8px 0', color: '#4b5563', fontSize: '14px' }}>
              Make sure your primary payment method is up-to-date and has sufficient funds. We'll
              retry the collection in the next 24 hours.
            </Text>
          </Section>
          <Text>
            If you need to update your payment method now, you can do so in your MiddleMan account.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Link
              href={viewBillUrl}
              style={{
                backgroundColor: '#3b82f6',
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
          <Hr />
          <Text style={{ fontSize: '12px', color: '#6b7280' }}>
            MiddleMan Inc. &mdash; One bill, all your subscriptions.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
