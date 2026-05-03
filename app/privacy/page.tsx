import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy & Terms — Slabsend',
}

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px 80px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1a1408', marginBottom: '8px' }}>
        Privacy &amp; Terms
      </h1>
      <p style={{ fontSize: '13px', color: '#9a9080', marginBottom: '40px' }}>
        Effective date: 1 January 2026 &nbsp;·&nbsp; slabsend.com
      </p>

      <Section title="1. Terms of Service">
        <p>These Terms of Service govern your use of the Slabsend marketplace (slabsend.com). By registering an account, you agree to be bound by these terms.</p>

        <SubSection title="1.1 About Slabsend">
          <p>Slabsend is a consumer-to-consumer (C2C) marketplace for buying, selling, and renting used climbing equipment. Slabsend acts solely as an intermediary platform connecting buyers and sellers. Slabsend is not a party to any transaction between users.</p>
        </SubSection>

        <SubSection title="1.2 Eligibility">
          <p>To use Slabsend you must:</p>
          <ul>
            <li>Be at least 18 years of age</li>
            <li>Have a valid payment method</li>
            <li>Sellers must be resident in Finland</li>
            <li>Buyers must be resident in Finland, Estonia, Latvia, Lithuania, Sweden, or any other EU/EEA country for rental transactions</li>
          </ul>
        </SubSection>

        <SubSection title="1.3 Account Registration">
          <p>You are responsible for maintaining the confidentiality of your account credentials. You must provide accurate and complete information when registering. Slabsend reserves the right to suspend or terminate accounts that violate these terms.</p>
        </SubSection>

        <SubSection title="1.4 Prohibited Items">
          <p>The following items may not be listed on Slabsend:</p>
          <ul>
            <li>Equipment that is damaged, expired, or unsafe for use</li>
            <li>Counterfeit or stolen goods</li>
            <li>Items unrelated to climbing or outdoor sports</li>
            <li>Items prohibited by Finnish law or EU regulations</li>
          </ul>
        </SubSection>

        <SubSection title="1.5 User Responsibilities">
          <p>You are responsible for the accuracy of all listings, including condition, size, and photos. Slabsend reserves the right to remove listings that violate these terms without notice.</p>
        </SubSection>

        <SubSection title="1.6 Payments">
          <p>All payments are processed via Stripe. Slabsend uses Stripe Connect to pay sellers. Funds are held until the buyer confirms receipt or the dispute window expires (21 days from delivery).</p>
        </SubSection>

        <SubSection title="1.7 Limitation of Liability">
          <p>Slabsend is not liable for any direct, indirect, or consequential damages arising from transactions on the platform. Our total liability is limited to the amount of the service fee paid in the relevant transaction.</p>
        </SubSection>
      </Section>

      <Section title="2. Privacy Policy">
        <p>This Privacy Policy explains how Slabsend (data controller) collects, uses, and protects your personal data in accordance with the EU General Data Protection Regulation (GDPR) and Finnish data protection law.</p>

        <SubSection title="2.1 Data We Collect">
          <p>We collect the following categories of personal data:</p>
          <ul>
            <li><strong>Account data:</strong> name, email address, phone number</li>
            <li><strong>Listing data:</strong> photos, item descriptions, pricing</li>
            <li><strong>Transaction data:</strong> purchase history, payment references</li>
            <li><strong>Shipping data:</strong> delivery addresses</li>
            <li><strong>Compliance data:</strong> terms acceptance timestamp and version</li>
            <li><strong>Usage data:</strong> log files, IP addresses, device type</li>
          </ul>
        </SubSection>

        <SubSection title="2.2 Legal Basis for Processing">
          <p>We process your data on the following legal bases:</p>
          <ul>
            <li><strong>Contract performance</strong> — to fulfil orders and provide the marketplace service</li>
            <li><strong>Legal obligation</strong> — to comply with tax, anti-fraud, and consumer protection laws</li>
            <li><strong>Legitimate interests</strong> — to improve the platform and prevent abuse</li>
            <li><strong>Consent</strong> — for marketing communications (opt-in only)</li>
          </ul>
        </SubSection>

        <SubSection title="2.3 Data Retention">
          <p>We retain personal data for as long as your account is active and for up to 5 years after account deletion, as required by Finnish accounting law. You may request deletion of your data at any time; however, we may retain data where required by law.</p>
        </SubSection>

        <SubSection title="2.4 Your Rights (GDPR)">
          <p>Under GDPR you have the right to:</p>
          <ul>
            <li><strong>Access</strong> — request a copy of your personal data</li>
            <li><strong>Rectification</strong> — correct inaccurate data</li>
            <li><strong>Erasure</strong> — request deletion of your data</li>
            <li><strong>Portability</strong> — receive your data in a machine-readable format</li>
            <li><strong>Objection</strong> — object to processing based on legitimate interests</li>
            <li><strong>Restriction</strong> — request that we limit how we use your data</li>
          </ul>
          <p>To exercise your rights, contact us at <a href="mailto:info@slabsend.com" style={{ color: '#FC7038' }}>info@slabsend.com</a>. You also have the right to lodge a complaint with the Finnish Data Protection Ombudsman (<a href="https://tietosuoja.fi" target="_blank" rel="noopener noreferrer" style={{ color: '#FC7038' }}>tietosuoja.fi</a>).</p>
        </SubSection>

        <SubSection title="2.5 Data Transfers">
          <p>Your data may be transferred to service providers outside the EEA (e.g., Stripe, Vercel, Resend). All such transfers are protected by Standard Contractual Clauses (SCCs) or an adequacy decision by the European Commission.</p>
        </SubSection>

        <SubSection title="2.6 Cookies">
          <p>Slabsend uses strictly necessary cookies for authentication and security. No advertising or tracking cookies are used without your explicit consent.</p>
        </SubSection>
      </Section>

      <Section title="3. Buyer Protection Policy">
        <p>Slabsend's Buyer Protection covers all purchases made through the platform where payment was processed via Stripe.</p>

        <SubSection title="3.1 What Is Covered">
          <ul>
            <li>Item not received within the agreed shipping window</li>
            <li>Item significantly not as described (wrong size, undisclosed damage, wrong model)</li>
            <li>Item arrives damaged due to inadequate packaging by the seller</li>
          </ul>
        </SubSection>

        <SubSection title="3.2 What Is Not Covered">
          <ul>
            <li>Purchases made outside of Slabsend (e.g., cash deals agreed via chat)</li>
            <li>Subjective dissatisfaction with condition where condition was accurately described</li>
            <li>Damage caused by the buyer after receipt</li>
            <li>Disputes raised more than 21 days after confirmed delivery</li>
          </ul>
        </SubSection>

        <SubSection title="3.3 How to File a Claim">
          <p>To file a claim, email <a href="mailto:info@slabsend.com" style={{ color: '#FC7038' }}>info@slabsend.com</a> within 21 days of delivery. Include your order number, photos of the item, and a description of the issue. Slabsend will review your claim within 5 business days. If approved, you will receive a full refund including shipping.</p>
        </SubSection>

        <SubSection title="3.4 Seller Responsibilities">
          <p>Sellers whose items are subject to a successful Buyer Protection claim may be subject to account restrictions or removal from the platform. Repeated violations will result in permanent suspension.</p>
        </SubSection>
      </Section>

      <Section title="4. Seller Terms">
        <p>These Seller Terms apply to all users who list items for sale on Slabsend. Sellers must be resident in Finland and have a verified Stripe Connect account.</p>

        <SubSection title="4.1 Listing Requirements">
          <ul>
            <li>All photos must be taken by the seller of the actual item</li>
            <li>Condition must be accurately described using Slabsend's five-tier scale: <strong>New / Excellent / Good / Fair / Poor</strong></li>
            <li>Price must be set in euros (EUR)</li>
            <li>Category and size must be correctly selected</li>
          </ul>
        </SubSection>

        <SubSection title="4.2 Payout Schedule">
          <p>Funds are released to the seller's Stripe Connect account once the buyer confirms receipt, or automatically after the dispute window expires. Maximum hold period is 90 days per Stripe's policies.</p>
        </SubSection>

        <SubSection title="4.3 Fees">
          <p>Slabsend does not charge sellers a listing fee. A 10% buyer protection fee is added to the purchase price and paid by the buyer. Slabsend may offer optional paid promoted listings to increase the visibility of a seller's listing on the platform.</p>
        </SubSection>

        <SubSection title="4.4 Shipping">
          <p>Sellers are responsible for shipping items within 3 business days of a confirmed sale. Slabsend integrates with Matkahuolto for domestic shipping. Sellers must use a tracked shipping method for all orders.</p>
        </SubSection>

        <SubSection title="4.5 Seller Warranty">
          <p>By listing an item you confirm that you own the item, it is free from legal encumbrances, and the description is accurate. Slabsend may suspend accounts found to engage in misrepresentation or fraud.</p>
        </SubSection>
      </Section>

      <Section title="5. Rental Terms">
        <p>Slabsend's rental feature allows users to rent climbing equipment directly from other users. The following terms apply to all rental transactions.</p>

        <SubSection title="5.1 Rental Agreement">
          <p>Each rental constitutes a separate agreement between the owner and renter. Slabsend facilitates the transaction but is not liable for loss, damage, or injury arising from rental items.</p>
        </SubSection>

        <SubSection title="5.2 Security Deposit">
          <p>Owners may require a security deposit (omavastuu). The deposit amount is set by the owner and displayed on the listing. The deposit is paid directly by the renter to the owner at the time of pickup, and returned by the owner when the item is returned in its original condition. Slabsend does not hold or process the security deposit.</p>
        </SubSection>

        <SubSection title="5.3 Damage Policy">
          <p>If an item is damaged during a rental period, the renter is liable for repair or replacement costs up to the declared value of the item. Disputes are handled through Slabsend's standard dispute resolution process.</p>
        </SubSection>

        <SubSection title="5.4 Insurance">
          <p>Slabsend does not currently provide insurance for rental items. Owners are advised to check their own insurance policies before listing items for rent.</p>
        </SubSection>
      </Section>

      <div style={{ marginTop: '48px', padding: '20px 24px', background: 'rgba(26,20,8,0.04)', borderRadius: '10px', fontSize: '13px', color: '#7a7060' }}>
        © 2026 Slabsend · <a href="mailto:info@slabsend.com" style={{ color: '#FC7038', fontWeight: 600 }}>info@slabsend.com</a>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '40px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1a1408', marginBottom: '16px', paddingBottom: '10px', borderBottom: '2px solid rgba(26,20,8,0.12)' }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px', color: '#3a3428', lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em', color: '#1a1408', marginBottom: '8px', marginTop: '4px' }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: '#3a3428', lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  )
}
