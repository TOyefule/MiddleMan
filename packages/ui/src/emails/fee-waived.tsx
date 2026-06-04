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

interface FeeWaivedEmailProps {
  userName: string;
  waiverAmount: string;
  reason: string;
  newTotal: string;
  viewBillUrl: string;
}

export default function FeeWaivedEmail({
  userName = 'there',
  waiverAmount = '$15.00',
  reason = 'Waived due to system error',
  newTotal = '$47.47',
  viewBillUrl = 'https://middleman.app/bills',
}: FeeWaivedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your late fee has been waived</Preview>
      <Body style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ maxWidth: '480px', margin: '40px auto', padding: '20px' }}>
          <Heading as="h1" style={{ fontSize: '24px', color: '#111827' }}>
            Good news! 🎉
          </Heading>
          <Text>Hey {userName},</Text>
          <Text>
            We're waiving the late fee of <strong>{waiverAmount}</strong> on your MiddleMan bill.
          </Text>
          <Text style={{ color: '#4b5563' }}>
            <strong>Why:</strong> {reason}
          </Text>
          <Section
            style={{
              backgroundColor: '#d1fae5',
              padding: '16px',
              borderRadius: '6px',
              marginY: '20px',
              borderLeft: '4px solid #10b981',
            }}
          >
            <Text style={{ margin: '0', fontWeight: 600 }}>
              Your new bill total: {newTotal}
            </Text>
          </Section>
          <Text>
            We appreciate your business, and we want to make this right. If you need any help getting
            your payment set up, please don't hesitate to reach out.
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
              View updated bill
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
