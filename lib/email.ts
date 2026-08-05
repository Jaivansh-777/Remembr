const RESEND_URL = "https://api.resend.com/emails";

export interface ProjectInviteEmail {
  to: string;
  inviterName: string;
  projectName: string;
  projectDescription?: string;
  inviteUrl: string;
}

/**
 * Sends a project invite email via Resend when a `RESEND_API_KEY` is
 * configured. Returns `false` (no throw) when no provider is configured so
 * callers can fall back to copying the invite link.
 */
export interface UpgradeConfirmationEmail {
  to: string;
  name?: string;
  plan: string;
  amount: number;
  paymentId?: string;
}

/**
 * Sends a plan-upgrade confirmation email via Resend when a `RESEND_API_KEY`
 * is configured. Returns `false` (no throw) when no provider is configured.
 */
export async function sendUpgradeConfirmation(
  email: UpgradeConfirmationEmail
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !email.to) return false;

  const subject = `You're on Remembr ${email.plan} 🎉`;
  const text = [
    email.name ? `Hi ${email.name},` : "Hi,",
    ``,
    `Your Remembr ${email.plan} plan is now active. You have unlimited cross-session memory — nothing gets lost between conversations.`,
    ``,
    `Plan: Remembr ${email.plan}`,
    `Amount paid: ₹${email.amount.toLocaleString("en-IN")}`,
    email.paymentId ? `Payment reference: ${email.paymentId}` : null,
    ``,
    `Everything you've told me is now remembered across sessions, forever.`,
    ``,
    `See you inside! 🧠`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Remembr <onboarding@resend.dev>",
        to: [email.to],
        subject,
        text,
      }),
    });

    if (!response.ok) {
      console.error(
        `[email] resend failed: ${response.status} ${await response.text()}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] send failed:", error);
    return false;
  }
}

export async function sendProjectInvite(
  email: ProjectInviteEmail
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const subject = `You've been invited to join ${email.projectName} on Remembr`;
  const text = [
    `Hi,`,
    ``,
    `${email.inviterName} has invited you to join their project on Remembr — an AI that remembers your team's context.`,
    ``,
    `Project: ${email.projectName}`,
    email.projectDescription
      ? `Description: ${email.projectDescription}`
      : null,
    ``,
    `Click here to join: ${email.inviteUrl}`,
    ``,
    `Remembr helps your team:`,
    `- Share memory across all team members`,
    `- Never re-explain project context again`,
    `- Onboard new members instantly with full context`,
    ``,
    `See you inside! 🧠`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Remembr <onboarding@resend.dev>",
        to: [email.to],
        subject,
        text,
      }),
    });

    if (!response.ok) {
      console.error(
        `[email] resend failed: ${response.status} ${await response.text()}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] send failed:", error);
    return false;
  }
}
