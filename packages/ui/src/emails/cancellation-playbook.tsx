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

interface CancellationPlaybookEmailProps {
  userName: string;
  providerName: string;
  cancelUrl: string;
  steps: string[];
}

export default function CancellationPlaybookEmail({
  userName = 'there',
  providerName = 'Netflix',
  cancelUrl = 'https://www.netflix.com/cancelplan',
  steps = [
    'Log in to your Netflix account',
    'Go to Account > Membership & Billing',
    'Click "Cancel Membership"',
    'Confirm the cancellation',
  ],
}: CancellationPlaybookEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>How to finish canceling {providerName}</Preview>
      <Body style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ maxWidth: '480px', margin: '40px auto', padding: '20px' }}>
          <Heading as="h1" style={{ fontSize: '24px', color: '#111827' }}>
            Cancel {providerName}
          </Heading>
          <Text>Hey {userName},</Text>
          <Text>
            We've <strong>paused the virtual card</strong> for {providerName} so no new charges will
            go through. To fully cancel your subscription with {providerName}, follow these steps:
          </Text>
          <ol style={{ paddingLeft: '20px' }}>
            {steps.map((step, i) => (
              <li key={i} style={{ marginBottom: '8px' }}>
                {step}
              </li>
            ))}
          </ol>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Link
              href={cancelUrl}
              style={{
                backgroundColor: '#3b82f6',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Go to {providerName}
            </Link>
          </Section>
          <Text>
            Once you've confirmed the cancellation, tap "I've canceled" in the MiddleMan app and
            we'll clean everything up.
          </Text>
          <Hr />
          <Text style={{ fontSize: '12px', color: '#6b7280' }}>
            MiddleMan Inc. &mdash; One bill, all your subscriptions.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
