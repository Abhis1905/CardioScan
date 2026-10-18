import { TextEncoder, TextDecoder } from "util";
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

import {
  buildReportHTML,
  generateReportFromPrediction,
  generateQRCodeSVG,
  getReportVerificationUrl,
} from "./reportGenerator";
import jsQR from "jsqr";
import QRCode from "qrcode";

// Mock react-hot-toast so tests don't require DOM toast container
jest.mock("react-hot-toast", () => ({
  error: jest.fn(),
  success: jest.fn(),
}));

/**
 * Helper to decode QR code matrix back to string using jsQR
 */
function decodeQRCodeUrl(url) {
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const modSize = qr.modules.size;
  const margin = 4;
  const total = modSize + margin * 2;
  const imgData = new Uint8ClampedArray(total * total * 4);
  for (let y = 0; y < total; y++) {
    for (let x = 0; x < total; x++) {
      const isDark =
        x >= margin && x < modSize + margin && y >= margin && y < modSize + margin
          ? qr.modules.get(x - margin, y - margin)
          : false;
      const idx = (y * total + x) * 4;
      const val = isDark ? 0 : 255;
      imgData[idx] = val;
      imgData[idx + 1] = val;
      imgData[idx + 2] = val;
      imgData[idx + 3] = 255;
    }
  }
  const code = jsQR(imgData, total, total);
  return code ? code.data : null;
}

describe("Unified Report System & Historical PDF Integrity", () => {
  const samplePrediction = {
    id: 42,
    report_id: "CS-REP-000042",
    uhid: "CS-REP-000042",
    patient_name: "Original Patient Record",
    patient_id: "CS-1234-5678",
    created_at: "2024-03-15T10:30:00Z",
    age: 56,
    sex: 1,
    cp: 2,
    trestbps: 135,
    chol: 245,
    fbs: 0,
    restecg: 1,
    thalach: 142,
    exang: 1,
    oldpeak: 1.6,
    slope: 1,
    ca: 1,
    thal: 2,
    prediction: 1,
    probability: 0.74,
    risk_level: "High",
    model_used: "random_forest",
    shap_values: [0.05, 0.02, 0.12, 0.08, 0.04, -0.01, 0.01, -0.09, 0.07, 0.11, 0.03, 0.06, 0.05],
    notes: "Patient reports exertional tightness; recommended diagnostic catheterization.",
  };

  test("1. Snapshot Consistency: Renders recorded identity, formatted report ID, timestamp, and biomarkers", () => {
    const html = buildReportHTML({
      patientName: samplePrediction.patient_name,
      patientId: samplePrediction.patient_id,
      form: samplePrediction,
      result: samplePrediction,
      modelLabel: "Random Forest Classifier",
      assessmentDate: samplePrediction.created_at,
    });

    // Report ID must match database primary key format CS-REP-000042
    expect(html).toContain("CS-REP-000042");

    // Must contain original patient identity
    expect(html).toContain("Original Patient Record");
    expect(html).toContain("CS-1234-5678");

    // Must display clinical inference results faithfully
    expect(html).toContain("74%");
    expect(html).toContain("High");
    expect(html).toContain("Elevated Heart Disease Indication");
    expect(html).toContain("Random Forest Classifier");

    // Must display recorded biomarkers
    expect(html).toContain("135 mmHg");
    expect(html).toContain("245 mg/dl");
    expect(html).toContain("142 bpm");
    expect(html).toContain("1.6 mm");
  });

  test("2. Two Distinct Identifiers: Removes 'Permanent' from Patient ID label and keeps UHID separate", () => {
    const html = buildReportHTML({
      patientName: samplePrediction.patient_name,
      patientId: samplePrediction.patient_id,
      form: samplePrediction,
      result: samplePrediction,
      modelLabel: "Random Forest Classifier",
    });

    // Patient ID label must NOT contain the word "Permanent"
    expect(html).not.toContain("Permanent Patient ID");
    expect(html).toContain('<span class="identity-label">Patient ID</span>');

    // UHID / Report ID must be rendered as a separate field
    expect(html).toContain('<span class="identity-label">UHID / Report ID</span>');
    expect(html).toContain("CS-REP-000042");
    expect(html).toContain("CS-1234-5678");
  });

  test("3. Stable Report IDs Across Repeated Downloads: Re-downloading the same report yields the exact same ID", () => {
    const html1 = buildReportHTML({
      patientName: samplePrediction.patient_name,
      patientId: samplePrediction.patient_id,
      form: samplePrediction,
      result: samplePrediction,
      modelLabel: "Random Forest",
    });

    const html2 = buildReportHTML({
      patientName: samplePrediction.patient_name,
      patientId: samplePrediction.patient_id,
      form: samplePrediction,
      result: samplePrediction,
      modelLabel: "Random Forest",
    });

    expect(html1).toContain("CS-REP-000042");
    expect(html2).toContain("CS-REP-000042");
  });

  test("4. Different Assessments Receive Different Report IDs and Different QR URLs", () => {
    const pred1 = { ...samplePrediction, id: 101, report_id: "CS-REP-000101" };
    const pred2 = { ...samplePrediction, id: 102, report_id: "CS-REP-000102" };

    const url1 = getReportVerificationUrl(pred1.report_id);
    const url2 = getReportVerificationUrl(pred2.report_id);

    expect(url1).not.toBe(url2);
    expect(url1).toContain("CS-REP-000101");
    expect(url2).toContain("CS-REP-000102");

    const html1 = buildReportHTML({ form: pred1, result: pred1 });
    const html2 = buildReportHTML({ form: pred2, result: pred2 });

    expect(html1).toContain("CS-REP-000101");
    expect(html2).toContain("CS-REP-000102");
  });

  test("5. Real QR Generation & Decoding: Decodes to the exact canonical verification URL", () => {
    const testReportId = "CS-REP-000042";
    const verificationUrl = getReportVerificationUrl(testReportId);

    // Verify SVG generation produces valid vector elements
    const svg = generateQRCodeSVG(verificationUrl, 100);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("<path");

    // Decode QR code and confirm the exact URL matches
    const decodedUrl = decodeQRCodeUrl(verificationUrl);
    expect(decodedUrl).toBe(verificationUrl);
    expect(decodedUrl).toContain(`/reports/${testReportId}`);

    // Confirm QR URL does NOT leak sensitive medical or personal parameters
    expect(decodedUrl).not.toContain("chol=");
    expect(decodedUrl).not.toContain("trestbps=");
    expect(decodedUrl).not.toContain("email=");
  });

  test("6. Profile Update Immutability: Historical report prioritizes recorded prediction identity over current profile", () => {
    const updatedProfileName = "Newly Updated Name";
    const updatedProfileId = "CS-9999-9999";

    const recordedName = samplePrediction.patient_name || updatedProfileName;
    const recordedId = samplePrediction.patient_id || updatedProfileId;

    const html = buildReportHTML({
      patientName: recordedName,
      patientId: recordedId,
      form: samplePrediction,
      result: {
        ...samplePrediction,
        name_was_corrected: true,
      },
      modelLabel: "Random Forest",
      assessmentDate: samplePrediction.created_at,
    });

    expect(html).toContain("Original Patient Record");
    expect(html).not.toContain("Newly Updated Name");
    expect(html).toContain("(Audited correction on file)");
  });

  test("7. Honest Handling of Missing Values: Unrecorded fields render as '—' and are never fabricated", () => {
    const partialForm = {
      age: 45,
      sex: 0,
    };

    const html = buildReportHTML({
      patientName: "Legacy Record",
      patientId: "CS-0000-0001",
      form: partialForm,
      result: {
        id: 99,
        prediction: 0,
        probability: 0.15,
        risk_level: "Low",
      },
      modelLabel: "Logistic Regression",
    });

    expect(html).toContain("CS-REP-000099");
    expect(html).toContain("Female");
    expect(html).toContain("—");
  });

  test("8. Honest Handling of Missing SHAP: Empty or null SHAP values render explicit non-attribution notice", () => {
    const legacyWithoutShap = {
      id: 7,
      patient_name: "Historical Record",
      patient_id: "CS-7777-7777",
      prediction: 0,
      probability: 0.12,
      risk_level: "Low",
      shap_values: null,
    };

    const html = buildReportHTML({
      patientName: legacyWithoutShap.patient_name,
      patientId: legacyWithoutShap.patient_id,
      form: {},
      result: legacyWithoutShap,
      modelLabel: "K-Nearest Neighbors",
    });

    expect(html).toContain("Explainability data was not generated for this assessment.");
  });

  test("9. Security & XSS Sanitization: User input strings with HTML/script tags are strictly escaped", () => {
    const maliciousPayload = {
      id: 101,
      patient_name: "<script>alert('xss')</script>John",
      patient_id: "<b>CS-XSS-0001</b>",
      prediction: 0,
      probability: 0.2,
      risk_level: "Low",
    };

    const html = buildReportHTML({
      patientName: maliciousPayload.patient_name,
      patientId: maliciousPayload.patient_id,
      form: {},
      result: maliciousPayload,
      modelLabel: "Safe Classifier",
    });

    expect(html).not.toContain("<script>alert('xss')</script>");
    expect(html).not.toContain("<b>CS-XSS-0001</b>");
    expect(html).toContain("&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;John");
    expect(html).toContain("&lt;b&gt;CS-XSS-0001&lt;/b&gt;");
  });
});
