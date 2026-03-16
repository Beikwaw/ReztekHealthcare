<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" indent="yes" encoding="UTF-8"/>
  <xsl:template match="/MedicalAidClaim">
    <html>
      <head>
        <meta charset="UTF-8"/>
        <title>Medical Aid Claim</title>
        <style>
          body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; }
          h1 { font-size: 1.25rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; }
          section { margin: 1.5rem 0; }
          section h2 { font-size: 1rem; color: #6b7280; margin-bottom: 0.5rem; }
          .row { display: flex; gap: 1rem; margin: 0.25rem 0; }
          .label { min-width: 140px; color: #6b7280; }
          .value { font-weight: 500; }
          table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
          th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #e5e7eb; }
          th { color: #6b7280; font-weight: 500; }
          .total { font-weight: 600; }
        </style>
      </head>
      <body>
        <h1>Medical Aid Claim</h1>
        <section>
          <h2>Practice / Doctor</h2>
          <div class="row"><span class="label">Doctor Name</span><span class="value"><xsl:value-of select="PracticeDoctor/DoctorName"/></span></div>
          <div class="row"><span class="label">Practice Name</span><span class="value"><xsl:value-of select="PracticeDoctor/PracticeName"/></span></div>
          <div class="row"><span class="label">Practice Number</span><span class="value"><xsl:value-of select="PracticeDoctor/PracticeNumber"/></span></div>
          <div class="row"><span class="label">HPCSA Number</span><span class="value"><xsl:value-of select="PracticeDoctor/HpcsaNumber"/></span></div>
        </section>
        <section>
          <h2>Patient</h2>
          <div class="row"><span class="label">Full Name</span><span class="value"><xsl:value-of select="Patient/FullName"/></span></div>
          <div class="row"><span class="label">ID Number</span><span class="value"><xsl:value-of select="Patient/IdNumber"/></span></div>
          <div class="row"><span class="label">Date of Birth</span><span class="value"><xsl:value-of select="Patient/DateOfBirth"/></span></div>
          <div class="row"><span class="label">Dependent Code</span><span class="value"><xsl:value-of select="Patient/DependentCode"/></span></div>
        </section>
        <section>
          <h2>Medical Aid</h2>
          <div class="row"><span class="label">Scheme</span><span class="value"><xsl:value-of select="MedicalAid/SchemeName"/></span></div>
          <div class="row"><span class="label">Membership Number</span><span class="value"><xsl:value-of select="MedicalAid/MembershipNumber"/></span></div>
          <div class="row"><span class="label">Plan</span><span class="value"><xsl:value-of select="MedicalAid/Plan"/></span></div>
        </section>
        <section>
          <h2>Consultation</h2>
          <div class="row"><span class="label">Date</span><span class="value"><xsl:value-of select="Consultation/ConsultationDate"/></span></div>
          <div class="row"><span class="label">Type</span><span class="value"><xsl:value-of select="Consultation/ConsultationType"/></span></div>
          <div class="row"><span class="label">Diagnosis</span><span class="value"><xsl:value-of select="Consultation/Diagnosis"/></span></div>
          <div class="row"><span class="label">ICD10 Code</span><span class="value"><xsl:value-of select="Consultation/Icd10Code"/></span></div>
        </section>
        <section>
          <h2>Billing</h2>
          <div class="row"><span class="label">Procedure Codes</span><span class="value"><xsl:value-of select="Billing/ProcedureCodes"/></span></div>
          <table>
            <thead><tr><th>Item</th><th>Amount (R)</th></tr></thead>
            <tbody>
              <xsl:for-each select="Billing/Items/Item">
                <tr><td><xsl:value-of select="Description"/></td><td><xsl:value-of select="Amount"/></td></tr>
              </xsl:for-each>
              <tr class="total"><td>Total</td><td><xsl:value-of select="Billing/TotalClaimAmount"/></td></tr>
            </tbody>
          </table>
        </section>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
