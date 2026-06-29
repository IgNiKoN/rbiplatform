// === AI Actions — Фаза 19 ===
// Бизнес-действия: делегируют в window.*-функции из ai.js.
// При отсутствии legacy-функции — console.warn.
// Публикуется как window.AIActions.

(function () {
  'use strict';

  function _call(name, fn, args) {
    if (typeof fn !== 'function') {
      console.warn('[AIActions] функция не найдена: ' + name);
      return;
    }
    return fn.apply(window, args);
  }

  window.AIActions = {

    _ctx: null,
    bindCtx(ctx) { this._ctx = ctx; },

    // ── Ядро ──────────────────────────────────────────────────────────────
    call(messages, options) {
      var aiSvc = this._ctx && this._ctx.ai;
      if (aiSvc) {
        return aiSvc.call(messages, options);
      }
      return _call('callAI', window.callAI, [messages, options]);
    },
    generateSmartComment(scenario) {
      return _call('generateSmartComment', window.generateSmartComment, [scenario]);
    },
    extractTextFromPdf(dataUrl) {
      return _call('extractTextFromPdf', window.extractTextFromPdf, [dataUrl]);
    },

    // ── Аналитика ─────────────────────────────────────────────────────────
    generatePulse() {
      return _call('generatePulseAi', window.generatePulseAi, []);
    },
    generateHeatmap() {
      return _call('generateHeatmapAi', window.generateHeatmapAi, []);
    },
    generateContractorForecast(contractorName) {
      return _call('generateContractorForecastAi', window.generateContractorForecastAi, [contractorName]);
    },
    generateOnePagerForecast(pdcaKey) {
      return _call('generateOnePagerForecastAi', window.generateOnePagerForecastAi, [pdcaKey]);
    },
    generateGlobal() {
      return _call('rbi_generateGlobalAi', window.rbi_generateGlobalAi, []);
    },

    // ── Задачи / FMEA / практики ──────────────────────────────────────────
    generatePrescription(inspectionId) {
      return _call('generatePrescriptionAi', window.generatePrescriptionAi, [inspectionId]);
    },
    generateTaskRisk(contractorName, templateKey, contains) {
      return _call('generateTaskRiskAi', window.generateTaskRiskAi, [contractorName, templateKey, contains]);
    },
    fillFmea() {
      return _call('rbi_fillFmeaWithAi', window.rbi_fillFmeaWithAi, []);
    },
    generateWorkshop(taskId) {
      return _call('rbi_generateWorkshop', window.rbi_generateWorkshop, [taskId]);
    },
    generateIntroBriefing(taskId) {
      return _call('rbi_generateIntroBriefing', window.rbi_generateIntroBriefing, [taskId]);
    },
    generateFinalAcceptance(taskId) {
      return _call('rbi_generateFinalAcceptance', window.rbi_generateFinalAcceptance, [taskId]);
    },
    generateMeetingMemo() {
      return _call('rbi_generateMeetingMemo', window.rbi_generateMeetingMemo, []);
    },
    generatePracticeTitle() {
      return _call('rbi_generatePracticeTitleAi', window.rbi_generatePracticeTitleAi, []);
    },
    beautifyPractice() {
      return _call('rbi_beautifyPracticeAi', window.rbi_beautifyPracticeAi, []);
    },

    // ── База знаний ───────────────────────────────────────────────────────
    generateTwiDraft() {
      return _call('generateTwiDraftAi', window.generateTwiDraftAi, []);
    },
    normalizeFeedback(rawText) {
      return _call('rbi_normalizeFeedbackAi', window.rbi_normalizeFeedbackAi, [rawText]);
    },

    // ── Чат с документом ─────────────────────────────────────────────────
    openDocChat() {
      return _call('openAiDocChat', window.openAiDocChat, []);
    },
    closeDocChat() {
      return _call('closeAiDocChat', window.closeAiDocChat, []);
    },
    askDocQuestion() {
      return _call('askAiDocQuestion', window.askAiDocQuestion, []);
    },

    // ── СК-специфичные ────────────────────────────────────────────────────
    skMapColumns() {
      return _call('sk_aiMapColumns', window.sk_aiMapColumns, []);
    },
    skAutoMapCategories(silent, forceAll) {
      return _call('sk_autoMapCategories', window.sk_autoMapCategories, [silent, forceAll]);
    },
    skContractorSummary(contractorName, safeId) {
      return _call('sk_generateContractorAiSummary', window.sk_generateContractorAiSummary, [contractorName, safeId]);
    },
    skPredictRisks(silent) {
      return _call('sk_predictRisksAi', window.sk_predictRisksAi, [silent]);
    },
    skAuditTemplates() {
      return _call('sk_auditTemplatesAi', window.sk_auditTemplatesAi, []);
    },

    // ── Геймификация ──────────────────────────────────────────────────────
    gameAddContractorAlias(canonicalKey, predefinedValue) {
      return _call('gameAddContractorAliasInline', window.gameAddContractorAliasInline, [canonicalKey, predefinedValue]);
    },
    gameContractorSynonyms(canonicalKey, displayName) {
      return _call('gameGenerateContractorSynonymsAI', window.gameGenerateContractorSynonymsAI, [canonicalKey, displayName]);
    },

    // ── Утилиты ───────────────────────────────────────────────────────────
    runSelfLearning() {
      return _call('runSelfLearningAi', window.runSelfLearningAi, []);
    },
    generateRoutePlan() {
      return _call('generateAiRoutePlan', window.generateAiRoutePlan, []);
    },
    generateTutorAdvice() {
      return _call('generateAiTutorAdvice', window.generateAiTutorAdvice, []);
    },
    generateHintForDefect() {
      return _call('generateAiHintForDefect', window.generateAiHintForDefect, []);
    },
    generateCultureAnalysis(contractorName) {
      return _call('generateCultureAi', window.generateCultureAi, [contractorName]);
    }
  };
})();
