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

interface BillIssuedEmailProps {
  userName: string;
  billDate: string;
  totalFormatted: string;
  dueDate: string;
  viewBillUrl: string;
}

export default function BillIssuedEmail({
  userName = 'there',
  billDate = 'Jun 1, 2026',
  totalFormatted = '$52.47',
  dueDate = 'Jun 4, 2026',
  viewBillUrl = 'https://middleman.app/bills',
}: BillIssuedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your MiddleMan bill for {billDate} is ready</Preview>
      <Body style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ maxWidth: '480px', margin: '40px auto', padding: '20px' }}>
          <Heading as="h1" style={{ fontSize: '24px', color: '#111827' }}>
            Your bill is ready
          </Heading>
          <Text>Hey {userName},</Text>
          <Text>
            Your MiddleMan consolidated bill for <strong>{billDate}</strong> is{' '}
            <strong>{totalFormatted}</strong>. Payment is due <strong>{dueDate}</strong>.
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
              View bill details
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
