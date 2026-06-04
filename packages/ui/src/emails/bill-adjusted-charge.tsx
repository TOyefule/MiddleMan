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

interface BillAdjustedChargeEmailProps {
  userName: string;
  adjustmentAmount: string;
  reason: string;
  newTotal: string;
  viewBillUrl: string;
}

export default function BillAdjustedChargeEmail({
  userName = 'there',
  adjustmentAmount = '$10.00',
  reason = 'Overage charge',
  newTotal = '$62.47',
  viewBillUrl = 'https://middleman.app/bills',
}: BillAdjustedChargeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your MiddleMan bill has been adjusted</Preview>
      <Body style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ maxWidth: '480px', margin: '40px auto', padding: '20px' }}>
          <Heading as="h1" style={{ fontSize: '24px', color: '#111827' }}>
            Bill adjustment
          </Heading>
          <Text>Hey {userName},</Text>
          <Text>
            We've added a charge of <strong>{adjustmentAmount}</strong> to your MiddleMan bill.
          </Text>
          <Text style={{ color: '#4b5563' }}>
            <strong>Reason:</strong> {reason}
          </Text>
          <Section
            style={{
              backgroundColor: '#fef3c7',
              padding: '16px',
              borderRadius: '6px',
              marginY: '20px',
              borderLeft: '4px solid #f59e0b',
            }}
          >
            <Text style={{ margin: '0', fontWeight: 600 }}>
              Your new bill total: {newTotal}
            </Text>
          </Section>
          <Text>If you have questions about this adjustment, please reach out to our support team.</Text>
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
