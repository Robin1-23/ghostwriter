import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Privacy.module.css';

export default function Privacy() {
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
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.lastUpdated}>Last Updated: June 19, 2026</p>

        <section className={styles.section}>
          <h2>1. Introduction</h2>
          <p>
            Welcome to Ghost ("we", "our", or "us"). We are committed to protecting your personal data and your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our web application located at <a href="https://writebyghost.xyz">writebyghost.xyz</a>.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Google API Services User Data Policy & Limited Use</h2>
          <p className={styles.highlight}>
            Ghost's use and transfer to any other app of information received from Google APIs will adhere to the <strong>Google API Services User Data Policy</strong>, including the <strong>Limited Use</strong> requirements.
          </p>
          <p>
            Specifically, we request permissions to:
          </p>
          <ul>
            <li><strong>https://www.googleapis.com/auth/gmail.readonly</strong>: To read your unread inbox emails to display them in your Inbox Co-Pilot panel and perform voice-matching draft generation.</li>
            <li><strong>https://www.googleapis.com/auth/gmail.compose</strong>: To create email replies in your drafts folder.</li>
          </ul>
          <p>
            All Google user data is accessed, fetched, and processed <strong>entirely client-side</strong> inside your browser using temporary local access tokens. We do not store, copy, or transmit your emails to our remote databases or servers.
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. Data Processing & AI Integrations</h2>
          <p>
            To generate personalized draft replies, the text of the incoming email is sent securely to OpenAI's APIs. We do not share any personal identifiers (such as your name, email address, or contact details) with OpenAI. 
          </p>
          <p>
            OpenAI processes this data strictly to generate your drafts. It is not used to train OpenAI's models or stored permanently.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Data Storage & Local Persistence</h2>
          <p>
            Your Google Access Token is stored locally in your browser's <code>localStorage</code> to keep you logged in across sessions. It is never transmitted to our servers.
          </p>
          <p>
            You can disconnect your Google account and revoke access at any time by clicking the <strong>"Disconnect"</strong> button in the Inbox Co-Pilot panel, which immediately deletes all stored OAuth credentials and emails from your browser.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. Sharing Your Information</h2>
          <p>
            We do not sell, trade, rent, or transfer your Google user data or other personal details to any third-party marketing networks, advertisers, or outside entities.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Contact Us</h2>
          <p>
            If you have any questions or concerns regarding this Privacy Policy or our data practices, please contact us at:
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
