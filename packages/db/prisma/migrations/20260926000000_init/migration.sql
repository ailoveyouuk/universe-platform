BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[organizations] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [slug] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [organizations_status_df] DEFAULT 'PILOT',
    [type] NVARCHAR(1000) NOT NULL CONSTRAINT [organizations_type_df] DEFAULT 'BUYER',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [organizations_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [organizations_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [organizations_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[users] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [entraObjectId] NVARCHAR(1000),
    [email] NVARCHAR(1000) NOT NULL,
    [forename] NVARCHAR(1000) NOT NULL,
    [surname] NVARCHAR(1000) NOT NULL,
    [jobTitle] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [users_status_df] DEFAULT 'INVITED',
    [platformStaffRole] NVARCHAR(1000) NOT NULL CONSTRAINT [users_platformStaffRole_df] DEFAULT 'NONE',
    [invitedById] NVARCHAR(1000),
    [invitedAt] DATETIME2 NOT NULL CONSTRAINT [users_invitedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [firstSignInAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [users_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [users_entraObjectId_key] UNIQUE NONCLUSTERED ([entraObjectId]),
    CONSTRAINT [users_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[roles] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000),
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [appScope] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [roles_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [roles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [roles_organizationId_name_appScope_key] UNIQUE NONCLUSTERED ([organizationId],[name],[appScope])
);

-- CreateTable
CREATE TABLE [dbo].[permissions] (
    [id] NVARCHAR(1000) NOT NULL,
    [key] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    CONSTRAINT [permissions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [permissions_key_key] UNIQUE NONCLUSTERED ([key])
);

-- CreateTable
CREATE TABLE [dbo].[role_permissions] (
    [roleId] NVARCHAR(1000) NOT NULL,
    [permissionId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [role_permissions_pkey] PRIMARY KEY CLUSTERED ([roleId],[permissionId])
);

-- CreateTable
CREATE TABLE [dbo].[user_roles] (
    [userId] NVARCHAR(1000) NOT NULL,
    [roleId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [user_roles_pkey] PRIMARY KEY CLUSTERED ([userId],[roleId])
);

-- CreateTable
CREATE TABLE [dbo].[partners] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [normalizedName] NVARCHAR(1000) NOT NULL,
    [countryCode] NVARCHAR(1000),
    [website] NVARCHAR(1000),
    [approvalStatus] NVARCHAR(1000) NOT NULL CONSTRAINT [partners_approvalStatus_df] DEFAULT 'PENDING',
    [isArchived] BIT NOT NULL CONSTRAINT [partners_isArchived_df] DEFAULT 0,
    [archivedAt] DATETIME2,
    [archivedById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [partners_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [partners_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[partner_roles] (
    [id] NVARCHAR(1000) NOT NULL,
    [partnerId] NVARCHAR(1000) NOT NULL,
    [roleType] NVARCHAR(1000) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [partner_roles_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [partner_roles_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [partner_roles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [partner_roles_partnerId_roleType_key] UNIQUE NONCLUSTERED ([partnerId],[roleType])
);

-- CreateTable
CREATE TABLE [dbo].[partner_supplier_details] (
    [partnerId] NVARCHAR(1000) NOT NULL,
    [supplierCode] NVARCHAR(1000),
    [productCategory] NVARCHAR(1000),
    [fdaRegistrationNumber] NVARCHAR(1000),
    CONSTRAINT [partner_supplier_details_pkey] PRIMARY KEY CLUSTERED ([partnerId])
);

-- CreateTable
CREATE TABLE [dbo].[partner_manufacturer_details] (
    [partnerId] NVARCHAR(1000) NOT NULL,
    [partNumberConvention] NVARCHAR(1000),
    [countryOfManufactureCode] NVARCHAR(1000),
    CONSTRAINT [partner_manufacturer_details_pkey] PRIMARY KEY CLUSTERED ([partnerId])
);

-- CreateTable
CREATE TABLE [dbo].[partner_freight_forwarder_details] (
    [partnerId] NVARCHAR(1000) NOT NULL,
    [preferredIncoterm] NVARCHAR(1000),
    [serviceRegions] NVARCHAR(max),
    CONSTRAINT [partner_freight_forwarder_details_pkey] PRIMARY KEY CLUSTERED ([partnerId])
);

-- CreateTable
CREATE TABLE [dbo].[partner_client_details] (
    [partnerId] NVARCHAR(1000) NOT NULL,
    [billingAddress] NVARCHAR(max),
    [deliveryAddress] NVARCHAR(max),
    [paymentTerms] NVARCHAR(1000),
    CONSTRAINT [partner_client_details_pkey] PRIMARY KEY CLUSTERED ([partnerId])
);

-- CreateTable
CREATE TABLE [dbo].[partner_certifications] (
    [id] NVARCHAR(1000) NOT NULL,
    [partnerId] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [issuedDate] DATETIME2,
    [expiryDate] DATETIME2,
    [documentId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [partner_certifications_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [partner_certifications_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[partner_approval_history] (
    [id] NVARCHAR(1000) NOT NULL,
    [partnerId] NVARCHAR(1000) NOT NULL,
    [action] NVARCHAR(1000) NOT NULL,
    [reason] NVARCHAR(max),
    [actionDate] DATETIME2 NOT NULL CONSTRAINT [partner_approval_history_actionDate_df] DEFAULT CURRENT_TIMESTAMP,
    [actionById] NVARCHAR(1000),
    CONSTRAINT [partner_approval_history_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[contacts] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [partnerId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000),
    [phone] NVARCHAR(1000),
    [title] NVARCHAR(1000),
    CONSTRAINT [contacts_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[projects] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [referenceNumber] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [projectType] NVARCHAR(1000) NOT NULL,
    [clientId] NVARCHAR(1000),
    [donorReference] NVARCHAR(1000),
    [deliveryCountryCode] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [projects_status_df] DEFAULT 'IDENTIFIED',
    [startDate] DATETIME2,
    [dueDate] DATETIME2,
    [submissionDate] DATETIME2,
    [managementResponsibility] NVARCHAR(1000),
    [reasonForCancellation] NVARCHAR(1000),
    [projectNotes] NVARCHAR(max),
    [projectFolderUrl] NVARCHAR(1000),
    [isArchived] BIT NOT NULL CONSTRAINT [projects_isArchived_df] DEFAULT 0,
    [archivedAt] DATETIME2,
    [archivedById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [projects_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [projects_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [projects_organizationId_referenceNumber_key] UNIQUE NONCLUSTERED ([organizationId],[referenceNumber])
);

-- CreateTable
CREATE TABLE [dbo].[project_field_groups] (
    [id] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [fieldGroupKey] NVARCHAR(1000) NOT NULL,
    [sortOrder] INT NOT NULL CONSTRAINT [project_field_groups_sortOrder_df] DEFAULT 0,
    CONSTRAINT [project_field_groups_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [project_field_groups_status_fieldGroupKey_key] UNIQUE NONCLUSTERED ([status],[fieldGroupKey])
);

-- CreateTable
CREATE TABLE [dbo].[project_leads] (
    [projectId] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [project_leads_pkey] PRIMARY KEY CLUSTERED ([projectId],[userId])
);

-- CreateTable
CREATE TABLE [dbo].[project_contacts] (
    [projectId] NVARCHAR(1000) NOT NULL,
    [contactId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [project_contacts_pkey] PRIMARY KEY CLUSTERED ([projectId],[contactId])
);

-- CreateTable
CREATE TABLE [dbo].[project_lines] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [projectId] NVARCHAR(1000) NOT NULL,
    [clientProductDescription] NVARCHAR(max),
    [productMasterId] NVARCHAR(1000),
    [attributes] NVARCHAR(max),
    [quantity] INT,
    [productCategory] NVARCHAR(1000),
    [countryOfManufactureCode] NVARCHAR(1000),
    [incoterm] NVARCHAR(1000),
    [freightMode] NVARCHAR(1000),
    [manufacturerId] NVARCHAR(1000),
    [supplierId] NVARCHAR(1000),
    [clientPoNumber] NVARCHAR(1000),
    [clientPoReceiptDate] DATETIME2,
    [internalPoNumber] NVARCHAR(1000),
    [internalPoDatePlaced] DATETIME2,
    [gad] DATETIME2,
    [supplierGad] DATETIME2,
    [freightForwarderId] NVARCHAR(1000),
    [freightCost] DECIMAL(18,2),
    [freightCurrency] CHAR(3),
    [warehouseReferenceNumber] NVARCHAR(1000),
    [goodsCollectedDate] DATETIME2,
    [goodsManufacturedDate] DATETIME2,
    [goodsDeliveredToClientDate] DATETIME2,
    [promisedDeliveryDate] DATETIME2,
    [actualDeliveryDate] DATETIME2,
    [internalOnTime] BIT,
    [supplierOnTime] BIT,
    [supplierInFull] BIT,
    [supplierUnitPrice] DECIMAL(18,2),
    [supplierPaymentAmountTotal] DECIMAL(18,2),
    [supplierPaymentCurrency] CHAR(3),
    [supplierPaymentDate] DATETIME2,
    [supplierDocumentsReceivedDate] DATETIME2,
    [supplierPaymentStatusPercent] DECIMAL(5,2),
    [unitSalesPrice] DECIMAL(18,2),
    [clientPaymentAmount] DECIMAL(18,2),
    [clientPaymentCurrency] CHAR(3),
    [clientPaymentDate] DATETIME2,
    [internalInvoiceNumber] NVARCHAR(1000),
    [internalInvoiceDate] DATETIME2,
    [grossMargin] DECIMAL(18,2),
    [margin] DECIMAL(5,2),
    [strength] NVARCHAR(1000),
    [form] NVARCHAR(1000),
    [packSize] NVARCHAR(1000),
    [batchNumber] NVARCHAR(1000),
    [expiryDate] DATETIME2,
    [storageConditions] NVARCHAR(1000),
    [dataLoggerReference] NVARCHAR(1000),
    [dataLoggerReportReviewed] BIT,
    [excursionReview] NVARCHAR(max),
    [customerApproved] BIT,
    [rpApproved] BIT,
    [maPl] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [project_lines_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [project_lines_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[supplier_enquiries] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [projectLineId] NVARCHAR(1000) NOT NULL,
    [supplierId] NVARCHAR(1000) NOT NULL,
    [dateContacted] DATETIME2,
    [responseStatus] NVARCHAR(1000) NOT NULL CONSTRAINT [supplier_enquiries_responseStatus_df] DEFAULT 'WAITING',
    [quotedPrice] DECIMAL(18,2),
    [quotedCurrency] CHAR(3),
    [notes] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [supplier_enquiries_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [supplier_enquiries_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[project_documents] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [projectId] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [url] NVARCHAR(1000) NOT NULL,
    [uploadedById] NVARCHAR(1000),
    [uploadedAt] DATETIME2 NOT NULL CONSTRAINT [project_documents_uploadedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [project_documents_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[product_lines] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [customerPoProductName] NVARCHAR(1000) NOT NULL,
    [gtin] NVARCHAR(1000),
    [poNumber] NVARCHAR(1000),
    [procurementOfficerId] NVARCHAR(1000),
    [poDate] DATETIME2,
    [productType] NVARCHAR(1000),
    [supplierId] NVARCHAR(1000),
    [supplierProductDescription] NVARCHAR(max),
    [manufacturerId] NVARCHAR(1000),
    [manufacturerPartNumber] NVARCHAR(1000),
    [unitOfSupply] NVARCHAR(1000),
    [exactMatchFlag] BIT,
    [matchNotes] NVARCHAR(max),
    [storageRequirement] NVARCHAR(1000),
    [productCertificationExpiry] DATETIME2,
    [productMasterId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [product_lines_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [product_lines_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[product_master] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [hsCode] NVARCHAR(1000),
    [unspscCode] NVARCHAR(1000),
    [gtin] NVARCHAR(1000),
    [standardUnit] NVARCHAR(1000),
    [canonicalManufacturerPartNumber] NVARCHAR(1000),
    [expectedQualityDocumentation] NVARCHAR(max),
    [sourceStandard] NVARCHAR(1000),
    [isArchived] BIT NOT NULL CONSTRAINT [product_master_isArchived_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [product_master_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [product_master_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[product_attribute_definitions] (
    [id] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [attributeKey] NVARCHAR(1000) NOT NULL,
    [label] NVARCHAR(1000) NOT NULL,
    [dataType] NVARCHAR(1000) NOT NULL,
    [enumOptions] NVARCHAR(max),
    [required] BIT NOT NULL CONSTRAINT [product_attribute_definitions_required_df] DEFAULT 0,
    [sortOrder] INT NOT NULL CONSTRAINT [product_attribute_definitions_sortOrder_df] DEFAULT 0,
    CONSTRAINT [product_attribute_definitions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [product_attribute_definitions_category_attributeKey_key] UNIQUE NONCLUSTERED ([category],[attributeKey])
);

-- CreateTable
CREATE TABLE [dbo].[product_price_history] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [productLineId] NVARCHAR(1000),
    [projectLineId] NVARCHAR(1000),
    [productMasterId] NVARCHAR(1000),
    [unitPrice] DECIMAL(18,2) NOT NULL,
    [currency] CHAR(3) NOT NULL,
    [effectiveDate] DATETIME2 NOT NULL CONSTRAINT [product_price_history_effectiveDate_df] DEFAULT CURRENT_TIMESTAMP,
    [recordedById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [product_price_history_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [product_price_history_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[regions] (
    [code] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [regions_pkey] PRIMARY KEY CLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[countries] (
    [code] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [regionCode] NVARCHAR(1000),
    CONSTRAINT [countries_pkey] PRIMARY KEY CLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[data_sharing_consents] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [scope] NVARCHAR(max) NOT NULL,
    [termsVersion] NVARCHAR(1000) NOT NULL,
    [acceptedById] NVARCHAR(1000),
    [acceptedAt] DATETIME2 NOT NULL CONSTRAINT [data_sharing_consents_acceptedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [revokedAt] DATETIME2,
    CONSTRAINT [data_sharing_consents_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [data_sharing_consents_organizationId_key] UNIQUE NONCLUSTERED ([organizationId])
);

-- CreateTable
CREATE TABLE [dbo].[supplier_profiles] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max),
    [website] NVARCHAR(1000),
    [contactName] NVARCHAR(1000),
    [contactEmail] NVARCHAR(1000),
    [contactPhone] NVARCHAR(1000),
    [publishedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [supplier_profiles_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [supplier_profiles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [supplier_profiles_organizationId_key] UNIQUE NONCLUSTERED ([organizationId])
);

-- CreateTable
CREATE TABLE [dbo].[supplier_country_presence] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [countryCode] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [supplier_country_presence_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [supplier_country_presence_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [supplier_country_presence_organizationId_countryCode_key] UNIQUE NONCLUSTERED ([organizationId],[countryCode])
);

-- CreateTable
CREATE TABLE [dbo].[supplier_products] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max),
    [productMasterId] NVARCHAR(1000),
    [specifications] NVARCHAR(max),
    [gtin] NVARCHAR(1000),
    [manufacturerPartNumber] NVARCHAR(1000),
    [isPublished] BIT NOT NULL CONSTRAINT [supplier_products_isPublished_df] DEFAULT 0,
    [createdById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [supplier_products_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [supplier_products_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[supplier_leads] (
    [id] NVARCHAR(1000) NOT NULL,
    [supplierOrganizationId] NVARCHAR(1000) NOT NULL,
    [buyerOrganizationId] NVARCHAR(1000) NOT NULL,
    [supplierProductId] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [supplier_leads_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [supplier_leads_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[_ProductAttributeDefinitionToProductMaster] (
    [A] NVARCHAR(1000) NOT NULL,
    [B] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [_ProductAttributeDefinitionToProductMaster_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [users_organizationId_idx] ON [dbo].[users]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [roles_organizationId_idx] ON [dbo].[roles]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [partners_organizationId_idx] ON [dbo].[partners]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [partners_organizationId_normalizedName_idx] ON [dbo].[partners]([organizationId], [normalizedName]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [partner_certifications_partnerId_idx] ON [dbo].[partner_certifications]([partnerId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [partner_certifications_expiryDate_idx] ON [dbo].[partner_certifications]([expiryDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [partner_approval_history_partnerId_idx] ON [dbo].[partner_approval_history]([partnerId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [contacts_organizationId_idx] ON [dbo].[contacts]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [projects_organizationId_status_idx] ON [dbo].[projects]([organizationId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [projects_clientId_idx] ON [dbo].[projects]([clientId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [project_lines_organizationId_idx] ON [dbo].[project_lines]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [project_lines_projectId_idx] ON [dbo].[project_lines]([projectId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [project_lines_supplierId_idx] ON [dbo].[project_lines]([supplierId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [project_lines_manufacturerId_idx] ON [dbo].[project_lines]([manufacturerId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [supplier_enquiries_organizationId_idx] ON [dbo].[supplier_enquiries]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [supplier_enquiries_projectLineId_idx] ON [dbo].[supplier_enquiries]([projectLineId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [project_documents_organizationId_idx] ON [dbo].[project_documents]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_lines_organizationId_idx] ON [dbo].[product_lines]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_lines_gtin_idx] ON [dbo].[product_lines]([gtin]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_lines_productMasterId_idx] ON [dbo].[product_lines]([productMasterId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_master_category_idx] ON [dbo].[product_master]([category]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_master_hsCode_idx] ON [dbo].[product_master]([hsCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_master_unspscCode_idx] ON [dbo].[product_master]([unspscCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_master_gtin_idx] ON [dbo].[product_master]([gtin]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_price_history_organizationId_idx] ON [dbo].[product_price_history]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_price_history_productMasterId_idx] ON [dbo].[product_price_history]([productMasterId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [supplier_products_organizationId_idx] ON [dbo].[supplier_products]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [supplier_products_productMasterId_idx] ON [dbo].[supplier_products]([productMasterId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [supplier_leads_supplierOrganizationId_idx] ON [dbo].[supplier_leads]([supplierOrganizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [supplier_leads_buyerOrganizationId_idx] ON [dbo].[supplier_leads]([buyerOrganizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_ProductAttributeDefinitionToProductMaster_B_index] ON [dbo].[_ProductAttributeDefinitionToProductMaster]([B]);

-- AddForeignKey
ALTER TABLE [dbo].[users] ADD CONSTRAINT [users_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[users] ADD CONSTRAINT [users_invitedById_fkey] FOREIGN KEY ([invitedById]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[roles] ADD CONSTRAINT [roles_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[role_permissions] ADD CONSTRAINT [role_permissions_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [dbo].[roles]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[role_permissions] ADD CONSTRAINT [role_permissions_permissionId_fkey] FOREIGN KEY ([permissionId]) REFERENCES [dbo].[permissions]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[user_roles] ADD CONSTRAINT [user_roles_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[user_roles] ADD CONSTRAINT [user_roles_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [dbo].[roles]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[partners] ADD CONSTRAINT [partners_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[partner_roles] ADD CONSTRAINT [partner_roles_partnerId_fkey] FOREIGN KEY ([partnerId]) REFERENCES [dbo].[partners]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[partner_supplier_details] ADD CONSTRAINT [partner_supplier_details_partnerId_fkey] FOREIGN KEY ([partnerId]) REFERENCES [dbo].[partners]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[partner_manufacturer_details] ADD CONSTRAINT [partner_manufacturer_details_partnerId_fkey] FOREIGN KEY ([partnerId]) REFERENCES [dbo].[partners]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[partner_freight_forwarder_details] ADD CONSTRAINT [partner_freight_forwarder_details_partnerId_fkey] FOREIGN KEY ([partnerId]) REFERENCES [dbo].[partners]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[partner_client_details] ADD CONSTRAINT [partner_client_details_partnerId_fkey] FOREIGN KEY ([partnerId]) REFERENCES [dbo].[partners]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[partner_certifications] ADD CONSTRAINT [partner_certifications_partnerId_fkey] FOREIGN KEY ([partnerId]) REFERENCES [dbo].[partners]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[partner_certifications] ADD CONSTRAINT [partner_certifications_documentId_fkey] FOREIGN KEY ([documentId]) REFERENCES [dbo].[project_documents]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[partner_approval_history] ADD CONSTRAINT [partner_approval_history_partnerId_fkey] FOREIGN KEY ([partnerId]) REFERENCES [dbo].[partners]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[contacts] ADD CONSTRAINT [contacts_partnerId_fkey] FOREIGN KEY ([partnerId]) REFERENCES [dbo].[partners]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[projects] ADD CONSTRAINT [projects_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[projects] ADD CONSTRAINT [projects_clientId_fkey] FOREIGN KEY ([clientId]) REFERENCES [dbo].[partners]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[project_leads] ADD CONSTRAINT [project_leads_projectId_fkey] FOREIGN KEY ([projectId]) REFERENCES [dbo].[projects]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[project_leads] ADD CONSTRAINT [project_leads_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[project_contacts] ADD CONSTRAINT [project_contacts_projectId_fkey] FOREIGN KEY ([projectId]) REFERENCES [dbo].[projects]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[project_contacts] ADD CONSTRAINT [project_contacts_contactId_fkey] FOREIGN KEY ([contactId]) REFERENCES [dbo].[contacts]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[project_lines] ADD CONSTRAINT [project_lines_projectId_fkey] FOREIGN KEY ([projectId]) REFERENCES [dbo].[projects]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[project_lines] ADD CONSTRAINT [project_lines_productMasterId_fkey] FOREIGN KEY ([productMasterId]) REFERENCES [dbo].[product_master]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[project_lines] ADD CONSTRAINT [project_lines_manufacturerId_fkey] FOREIGN KEY ([manufacturerId]) REFERENCES [dbo].[partners]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[project_lines] ADD CONSTRAINT [project_lines_supplierId_fkey] FOREIGN KEY ([supplierId]) REFERENCES [dbo].[partners]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[project_lines] ADD CONSTRAINT [project_lines_freightForwarderId_fkey] FOREIGN KEY ([freightForwarderId]) REFERENCES [dbo].[partners]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[supplier_enquiries] ADD CONSTRAINT [supplier_enquiries_projectLineId_fkey] FOREIGN KEY ([projectLineId]) REFERENCES [dbo].[project_lines]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[supplier_enquiries] ADD CONSTRAINT [supplier_enquiries_supplierId_fkey] FOREIGN KEY ([supplierId]) REFERENCES [dbo].[partners]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[project_documents] ADD CONSTRAINT [project_documents_projectId_fkey] FOREIGN KEY ([projectId]) REFERENCES [dbo].[projects]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[project_documents] ADD CONSTRAINT [project_documents_uploadedById_fkey] FOREIGN KEY ([uploadedById]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_lines] ADD CONSTRAINT [product_lines_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_lines] ADD CONSTRAINT [product_lines_supplierId_fkey] FOREIGN KEY ([supplierId]) REFERENCES [dbo].[partners]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_lines] ADD CONSTRAINT [product_lines_manufacturerId_fkey] FOREIGN KEY ([manufacturerId]) REFERENCES [dbo].[partners]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_lines] ADD CONSTRAINT [product_lines_productMasterId_fkey] FOREIGN KEY ([productMasterId]) REFERENCES [dbo].[product_master]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_price_history] ADD CONSTRAINT [product_price_history_productLineId_fkey] FOREIGN KEY ([productLineId]) REFERENCES [dbo].[product_lines]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_price_history] ADD CONSTRAINT [product_price_history_projectLineId_fkey] FOREIGN KEY ([projectLineId]) REFERENCES [dbo].[project_lines]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_price_history] ADD CONSTRAINT [product_price_history_productMasterId_fkey] FOREIGN KEY ([productMasterId]) REFERENCES [dbo].[product_master]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_price_history] ADD CONSTRAINT [product_price_history_recordedById_fkey] FOREIGN KEY ([recordedById]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[countries] ADD CONSTRAINT [countries_regionCode_fkey] FOREIGN KEY ([regionCode]) REFERENCES [dbo].[regions]([code]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[data_sharing_consents] ADD CONSTRAINT [data_sharing_consents_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[data_sharing_consents] ADD CONSTRAINT [data_sharing_consents_acceptedById_fkey] FOREIGN KEY ([acceptedById]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[supplier_profiles] ADD CONSTRAINT [supplier_profiles_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[supplier_country_presence] ADD CONSTRAINT [supplier_country_presence_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[supplier_country_presence] ADD CONSTRAINT [supplier_country_presence_countryCode_fkey] FOREIGN KEY ([countryCode]) REFERENCES [dbo].[countries]([code]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[supplier_products] ADD CONSTRAINT [supplier_products_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[supplier_products] ADD CONSTRAINT [supplier_products_productMasterId_fkey] FOREIGN KEY ([productMasterId]) REFERENCES [dbo].[product_master]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[supplier_products] ADD CONSTRAINT [supplier_products_createdById_fkey] FOREIGN KEY ([createdById]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[supplier_leads] ADD CONSTRAINT [supplier_leads_supplierOrganizationId_fkey] FOREIGN KEY ([supplierOrganizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[supplier_leads] ADD CONSTRAINT [supplier_leads_buyerOrganizationId_fkey] FOREIGN KEY ([buyerOrganizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[supplier_leads] ADD CONSTRAINT [supplier_leads_supplierProductId_fkey] FOREIGN KEY ([supplierProductId]) REFERENCES [dbo].[supplier_products]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[_ProductAttributeDefinitionToProductMaster] ADD CONSTRAINT [_ProductAttributeDefinitionToProductMaster_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[product_attribute_definitions]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_ProductAttributeDefinitionToProductMaster] ADD CONSTRAINT [_ProductAttributeDefinitionToProductMaster_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[product_master]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

