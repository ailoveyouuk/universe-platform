BEGIN TRY

BEGIN TRAN;

-- CreateIndex
CREATE NONCLUSTERED INDEX [users_organizationId_status_invitedAt_idx] ON [dbo].[users]([organizationId], [status], [invitedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [partners_organizationId_isArchived_createdAt_idx] ON [dbo].[partners]([organizationId], [isArchived], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [partners_organizationId_approvalStatus_isArchived_idx] ON [dbo].[partners]([organizationId], [approvalStatus], [isArchived]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [partner_roles_roleType_partnerId_idx] ON [dbo].[partner_roles]([roleType], [partnerId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_source_approvals_organizationId_status_isArchived_createdAt_idx] ON [dbo].[product_source_approvals]([organizationId], [status], [isArchived], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [contacts_organizationId_name_idx] ON [dbo].[contacts]([organizationId], [name]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [projects_organizationId_isArchived_dueDate_idx] ON [dbo].[projects]([organizationId], [isArchived], [dueDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [projects_organizationId_isArchived_updatedAt_idx] ON [dbo].[projects]([organizationId], [isArchived], [updatedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [supplier_enquiries_supplierId_responseStatus_idx] ON [dbo].[supplier_enquiries]([supplierId], [responseStatus]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_amendments_organizationId_status_submittedAt_idx] ON [dbo].[product_amendments]([organizationId], [status], [submittedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [stakeholder_evidence_records_organizationId_status_createdAt_idx] ON [dbo].[stakeholder_evidence_records]([organizationId], [status], [createdAt]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

