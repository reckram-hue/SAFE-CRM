
import type { ClientFormProps } from './form/types';
import { useClientForm } from './form/useClientForm';
import ClientBasicInfoSection from './form/ClientBasicInfoSection';
import ClientSitesSection from './form/ClientSitesSection';
import ClientServicesSection from './form/ClientServicesSection';
import ClientAlarmSection from './form/ClientAlarmSection';
import ClientContactsSection from './form/ClientContactsSection';
import ClientHardwareSection from './form/ClientHardwareSection';

export default function ClientForm({ mode, initialData, onSubmitSuccess, onCancel }: ClientFormProps) {
  const form = useClientForm({ mode, initialData, onSubmitSuccess });

  return (
    <form onSubmit={form.handleSubmit} className="space-y-8 bg-slate-900/60 border border-slate-800 p-8 rounded-2xl max-w-4xl mx-auto shadow-2xl text-slate-100">

      {/* Global form error banner */}
      {form.error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-xl">
          {form.error}
        </div>
      )}

      {/* Section 1 (Particulars) + Section 4 (Payment) */}
      <ClientBasicInfoSection
        clientType={form.clientType} setClientType={form.setClientType}
        title={form.title} setTitle={form.setTitle}
        firstName={form.firstName} setFirstName={form.setFirstName}
        surname={form.surname} setSurname={form.setSurname}
        companyName={form.companyName} setCompanyName={form.setCompanyName}
        vatNo={form.vatNo} setVatNo={form.setVatNo}
        companyRegNo={form.companyRegNo} setCompanyRegNo={form.setCompanyRegNo}
        idPassportNo={form.idPassportNo} setIdPassportNo={form.setIdPassportNo}
        clientSince={form.clientSince} setClientSince={form.setClientSince}
        anniversaryMonth={form.anniversaryMonth} setAnniversaryMonth={form.setAnniversaryMonth}
      />

      {/* Section 2 — Site Details */}
      <ClientSitesSection
        towns={form.towns} suburbs={form.suburbs} sectors={form.sectors} estates={form.estates} streets={form.streets}
        siteName={form.siteName} setSiteName={form.setSiteName}
        streetNumber={form.streetNumber} setStreetNumber={form.setStreetNumber}
        unitNumber={form.unitNumber} setUnitNumber={form.setUnitNumber}
        streetName={form.streetName} setStreetName={form.setStreetName}
        streetId={form.streetId} setStreetId={form.setStreetId}
        townId={form.townId} setTownId={form.setTownId}
        townName={form.townName} setTownName={form.setTownName}
        suburbId={form.suburbId} setSuburbId={form.setSuburbId}
        suburbName={form.suburbName} setSuburbName={form.setSuburbName}
        sectorId={form.sectorId} setSectorId={form.setSectorId}
        estateId={form.estateId} setEstateId={form.setEstateId}
        sitePhone={form.sitePhone} setSitePhone={form.setSitePhone}
        cctvCameraCount={form.cctvCameraCount} setCctvCameraCount={form.setCctvCameraCount}
        annualMaintenanceFee={form.annualMaintenanceFee} setAnnualMaintenanceFee={form.setAnnualMaintenanceFee}
        accessType={form.accessType} setAccessType={form.setAccessType}
        keyNumberRef={form.keyNumberRef} setKeyNumberRef={form.setKeyNumberRef}
        keyVaultLocation={form.keyVaultLocation} setKeyVaultLocation={form.setKeyVaultLocation}
        accessCodeNotes={form.accessCodeNotes} setAccessCodeNotes={form.setAccessCodeNotes}
        siteOperationsNotes={form.siteOperationsNotes} setSiteOperationsNotes={form.setSiteOperationsNotes}
      />

      {/* Section 3 — Financial & Billing Setup */}
      <ClientServicesSection
        billingCycles={form.billingCycles}
        paymentMethodsList={form.paymentMethodsList}
        billingCycle={form.billingCycle} setBillingCycle={form.setBillingCycle}
        monthlyTariff={form.monthlyTariff} setMonthlyTariff={form.setMonthlyTariff}
        itemizedTotal={form.itemizedTotal} handleSyncTariff={form.handleSyncTariff}
        paymentMethod={form.paymentMethod} setPaymentMethod={form.setPaymentMethod}
        bankName={form.bankName} setBankName={form.setBankName}
        accountType={form.accountType} setAccountType={form.setAccountType}
        branchCode={form.branchCode} setBranchCode={form.setBranchCode}
        accountNo={form.accountNo} setAccountNo={form.setAccountNo}
        accountHolderName={form.accountHolderName} setAccountHolderName={form.setAccountHolderName}
        servicesList={form.servicesList}
        generalServices={form.generalServices}
        selectedServices={form.selectedServices}
        emailReportOption={form.emailReportOption} setEmailReportOption={form.setEmailReportOption}
        smsOption={form.smsOption} setSmsOption={form.setSmsOption}
        clientSince={form.clientSince}
        handleServiceCheckboxToggle={form.handleServiceCheckboxToggle}
        handleNegotiatedFeeChange={form.handleNegotiatedFeeChange}
        handleDiscountReasonChange={form.handleDiscountReasonChange}
        getDaysRemainingUntilDec1={form.getDaysRemainingUntilDec1}
      />

      {/* Section 4 — Hardware & Transmitters */}
      <ClientHardwareSection
        primaryTransmitterNo={form.primaryTransmitterNo} setPrimaryTransmitterNo={form.setPrimaryTransmitterNo}
        primaryPortId={form.primaryPortId} setPrimaryPortId={form.setPrimaryPortId}
        primaryIsBillableMonthly={form.primaryIsBillableMonthly} setPrimaryIsBillableMonthly={form.setPrimaryIsBillableMonthly}
        primaryMonthlyFee={form.primaryMonthlyFee} setPrimaryMonthlyFee={form.setPrimaryMonthlyFee}
        primaryHasAnnualLicenseFee={form.primaryHasAnnualLicenseFee} setPrimaryHasAnnualLicenseFee={form.setPrimaryHasAnnualLicenseFee}
        primaryHasAnnualGsmFee={form.primaryHasAnnualGsmFee} setPrimaryHasAnnualGsmFee={form.setPrimaryHasAnnualGsmFee}
        
        secondaryTransmitterNo={form.secondaryTransmitterNo} setSecondaryTransmitterNo={form.setSecondaryTransmitterNo}
        secondaryPortId={form.secondaryPortId} setSecondaryPortId={form.setSecondaryPortId}
        secondaryIsBillableMonthly={form.secondaryIsBillableMonthly} setSecondaryIsBillableMonthly={form.setSecondaryIsBillableMonthly}
        secondaryMonthlyFee={form.secondaryMonthlyFee} setSecondaryMonthlyFee={form.setSecondaryMonthlyFee}
        secondaryHasAnnualLicenseFee={form.secondaryHasAnnualLicenseFee} setSecondaryHasAnnualLicenseFee={form.setSecondaryHasAnnualLicenseFee}
        secondaryHasAnnualGsmFee={form.secondaryHasAnnualGsmFee} setSecondaryHasAnnualGsmFee={form.setSecondaryHasAnnualGsmFee}
        
        transmitterHistory={form.transmitterHistory}
      />

      {/* Section 5 — Alarms & Zones */}
      <ClientAlarmSection
        alarmMakes={form.alarmMakes}
        zoneTypes={form.zoneTypes}
        zoneDescriptors={form.zoneDescriptors}
        alarmMakeId={form.alarmMakeId}
        setAlarmMakeId={form.setAlarmMakeId}
        alarmModelId={form.alarmModelId}
        setAlarmModelId={form.setAlarmModelId}
        zones={form.zones}
        handleZoneChange={form.handleZoneChange}
        handleRemoveZone={form.handleRemoveZone}
        handleAddZone={form.handleAddZone}
      />

      {/* Section 5 — Emergency Contacts */}
      <ClientContactsSection
        contacts={form.contacts}
        setContactSearchQuery={form.setContactSearchQuery}
        contactSearchResults={form.contactSearchResults}
        activeContactIndex={form.activeContactIndex}
        setActiveContactIndex={form.setActiveContactIndex}
        handleSelectExistingContact={form.handleSelectExistingContact}
        handleContactChange={form.handleContactChange}
        handleRemoveContact={form.handleRemoveContact}
        handleAddContact={form.handleAddContact}
        moveContactUp={form.moveContactUp}
        moveContactDown={form.moveContactDown}
      />

      {/* Action buttons */}
      <div className="flex justify-end gap-4 border-t border-slate-800 pt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:border-slate-700 transition-colors text-sm font-semibold"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={form.loading}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold transition-all disabled:opacity-50 text-sm shadow-lg shadow-indigo-600/20"
        >
          {form.loading ? 'Saving...' : mode === 'add' ? 'Create Client' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
