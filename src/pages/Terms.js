import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Terms.module.css';

export default function Terms() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoDot}></span>
          Ghost
        </Link>
        <Link to="/" className={styles.backBtn}>
          <i className="ti ti-arrow-left"></i> Back to Home
        </Link>
      </header>

      <main className={styles.content}>
        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.lastUpdated}>Last Updated: June 19, 2026</p>

        <section className={styles.section}>
          <h2>1. Agreement to Terms</h2>
          <p>
            By accessing or using Ghost located at <a href="https://writebyghost.xyz">writebyghost.xyz</a>, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not access or use the Service.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Description of Service</h2>
          <p>
            Ghost is an AI-powered personal writing assistant. It helps you draft email replies and initiate messages tailored to your personal voice using third-party integrations (such as OpenAI and Google Gmail APIs).
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. Gmail & Google Account Integrations</h2>
          <p>
            You may choose to connect your Google Gmail account to the Service to synchronize unread messages and write draft replies directly to your inbox.
          </p>
          <p>
            You acknowledge that:
          </p>
          <ul>
            <li>Connection to Gmail is voluntary and runs entirely client-side.</li>
            <li>We do not store your emails or OAuth access tokens on remote databases.</li>
            <li>You can disconnect your account at any time to immediately revoke local access.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>4. AI-Generated Content & User Responsibility</h2>
          <p>
            Ghost provides automated pre-drafted text suggestions ("Content") using generative AI models. 
          </p>
          <p className={styles.warningBlock}>
            <strong>Important</strong>: You are solely responsible for reviewing and editing all AI-generated drafts before sending them to any recipient. We are not responsible or liable for any communication sent, emails drafted, or actions taken based on AI-generated suggestions.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. User Accounts & Security</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials (such as Google / Firebase logins). You agree to notify us immediately of any unauthorized use of your account.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Ghost and its developers shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or use, arising out of or related to your use of the Service.
          </p>
        </section>

        <section className={styles.section}>
          <h2>7. Contact Information</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us at:
          </p>
          <p className={styles.contactEmail}>
            Email: <a href="mailto:robinjain142001@gmail.com">robinjain142001@gmail.com</a>
          </p>
        </section>
      </main>

      <footer className={styles.footer}>
        &copy; 2026 Ghost. All rights reserved.
      </footer>
    </div>
  );
}
