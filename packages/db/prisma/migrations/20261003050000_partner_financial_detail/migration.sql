BEGIN TRAN;

-- CreateTable: partner_financial_details — standard banking/financial
-- information for a stakeholder, one per Partner, applying to every
-- role (not gated to manufacturer/supplier/etc, same reasoning as the
-- Company Checks and Documents/Certifications packet applying to all
-- roles). Lewis's 2026-10-02 request: "for all stakeholders, ensure
-- they have...financial information (account number, sort code, iban,
-- bank name, branch address etc)".
CREATE TABLE [dbo].[partner_financial_details] (
    [partnerId] NVARCHAR(1000) NOT NULL,
    [bankName] NVARCHAR(1000),
    [accountHolderName] NVARCHAR(1000),
    [accountNumber] NVARCHAR(1000),
    [sortCode] NVARCHAR(1000),
    [iban] NVARCHAR(1000),
    [swiftBic] NVARCHAR(1000),
    [branchAddress] NVARCHAR(max),
    [currencyCode] NVARCHAR(1000),
    CONSTRAINT [partner_financial_details_pkey] PRIMARY KEY CLUSTERED ([partnerId])
);

-- AddForeignKey
ALTER TABLE [dbo].[partner_financial_details] ADD CONSTRAINT [partner_financial_details_partnerId_fkey] FOREIGN KEY ([partnerId]) REFERENCES [dbo].[partners]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;
