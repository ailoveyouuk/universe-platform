-- Projects can deliver to several countries. deliveryCountryCode stays as the primary (first) destination.
ALTER TABLE [dbo].[projects] ADD [deliveryCountryCodes] NVARCHAR(1000) NULL;

-- Existing projects: their single country becomes the one-item list.
EXEC('UPDATE [dbo].[projects] SET [deliveryCountryCodes] = '',''+[deliveryCountryCode]+'','' WHERE [deliveryCountryCode] IS NOT NULL');
