import type { AnalyzeResult } from "./schema";

// Demo scenarios: prefill text for the input panel, plus a sample result the
// UI shows in design-preview mode until /api/analyze is wired up.

export type Scenario = {
  id: "medical" | "flood" | "rumour";
  label: string;
  tag: string;
  prefill: string;
  sample: AnalyzeResult;
};

const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

export const SCENARIOS: Scenario[] = [
  {
    id: "medical",
    label: "Prescription + history",
    tag: "Hindi · photo",
    prefill:
      "पापा को BP और शुगर की दवा चलती है। डॉक्टर ने नई खून पतला करने की दवा दी है, और वो पहले से रोज़ एस्पिरिन भी लेते हैं। आज सुबह से सीने में भारीपन और चक्कर आ रहे हैं।",
    sample: {
      verified: true,
      sources: [
        { title: "Anticoagulants and aspirin — bleeding risk (NHS)", url: "https://www.nhs.uk/medicines/" },
        { title: "Warning signs of a heart attack (WHO)", url: "https://www.who.int/" },
      ],
      signals: [
        { label: "Language", value: "Hindi (auto-detected)" },
        { label: "Inputs", value: "Text · 1 photo" },
      ],
      card: {
        situation:
          "An older adult on blood-pressure and diabetes medicines was recently prescribed a blood thinner, also takes daily aspirin, and has had chest heaviness and dizziness since morning.",
        language_code: "en",
        category: "medical",
        risk_level: "high",
        risk_reason:
          "Chest heaviness with dizziness needs urgent medical assessment, and a blood thinner taken with aspirin raises bleeding risk.",
        verified_facts: [
          {
            claim: "Taking an anticoagulant together with aspirin increases the risk of bleeding.",
            source: "NHS medicines guidance",
            status: "verified",
          },
          {
            claim: "Chest heaviness with dizziness can be a warning sign of a heart problem.",
            source: "WHO",
            status: "verified",
          },
          {
            claim: "Dose of the new blood thinner on the prescription",
            source: "Prescription photo",
            status: "unverified",
          },
        ],
        actions: [
          {
            title: "Call an ambulance now",
            detail: "Chest heaviness with dizziness should be checked by a doctor today, in person.",
            urgency: "now",
            type: "call",
            payload: { phone: "108" },
            needs_confirmation: true,
          },
          {
            title: "Tell the doctor about the aspirin",
            detail: "Ask whether aspirin should continue alongside the new blood thinner. Do not stop or change any medicine on your own.",
            urgency: "today",
            type: "message",
            payload: {
              message:
                "Doctor, Papa was prescribed a new blood thinner and also takes aspirin daily. Since this morning he has chest heaviness and dizziness. Please advise urgently.",
            },
            needs_confirmation: true,
          },
          {
            title: "Remind me to recheck in 2 hours",
            detail: "Note any new symptoms: pain spreading to the arm or jaw, sweating, breathlessness.",
            urgency: "today",
            type: "reminder",
            payload: { time_iso: inHours(2), message: "Recheck Papa's symptoms" },
            needs_confirmation: false,
          },
          {
            title: "Directions to the nearest hospital",
            detail: "Opens Google Maps with directions from your location.",
            urgency: "now",
            type: "navigate",
            payload: { destination: "hospital near me" },
            needs_confirmation: false,
          },
        ],
        contacts: [
          { name: "Ambulance", number: "108", why: "Chest symptoms with dizziness" },
          { name: "All emergencies", number: "112", why: "If symptoms get worse" },
        ],
        health_card: {
          name: "Ramesh Kumar",
          age: "64",
          blood_group: "Not stated",
          conditions: ["High blood pressure", "Type 2 diabetes"],
          medicines: [
            { name: "Amlodipine", dose: "5 mg", frequency: "Once daily" },
            { name: "Metformin", dose: "500 mg", frequency: "Twice daily" },
            { name: "Aspirin", dose: "75 mg", frequency: "Once daily" },
            { name: "Blood thinner (name unclear)", dose: "Unreadable", frequency: "Unreadable" },
          ],
          allergies: ["None stated"],
          warnings: ["Aspirin + blood thinner: higher bleeding risk — confirm with doctor"],
        },
        rumor_verdict: null,
        confidence: 78,
        couldnt_verify: [
          "The name and dose of the new blood thinner — the handwriting is unclear.",
          "Whether the doctor knows about the daily aspirin.",
        ],
        critic_notes: ["Removed a guessed dose for the blood thinner.", "Added WHO warning signs as source."],
        spoken_summary:
          "Chest heaviness and dizziness need a doctor today. The new blood thinner together with aspirin can raise bleeding risk.",
      },
    },
  },
  {
    id: "flood",
    label: "Water entering home",
    tag: "Marathi · voice",
    prefill:
      "आमच्या गल्लीत पाणी घरात शिरतंय. आजी ऑक्सिजन कॉन्सन्ट्रेटरवर आहेत आणि लाईट कधीही जाऊ शकते. काय करू?",
    sample: {
      verified: true,
      sources: [
        { title: "Open-Meteo forecast for your location", url: "https://open-meteo.com/" },
        { title: "NDMA — Floods: do's and don'ts", url: "https://ndma.gov.in/" },
      ],
      signals: [
        { label: "Weather", value: "Heavy rain · 86% chance next 12h · 48 mm today" },
        { label: "News", value: "IMD orange alert for the district" },
        { label: "Language", value: "Marathi (auto-detected)" },
      ],
      card: {
        situation:
          "Floodwater is entering the home while an elderly family member depends on an oxygen concentrator and power may fail.",
        language_code: "en",
        category: "disaster",
        risk_level: "critical",
        risk_reason: "Rising water plus a person who depends on powered oxygen. A power cut could become life-threatening.",
        verified_facts: [
          { claim: "Heavy rain is forecast for the next 12 hours.", source: "Open-Meteo", status: "verified" },
          { claim: "Switch off the mains before water reaches sockets.", source: "NDMA guidance", status: "verified" },
          { claim: "Local shelters are open in your ward.", source: "Not found", status: "unverified" },
        ],
        actions: [
          {
            title: "Call 112 and say a patient needs oxygen",
            detail: "Ask for evacuation priority. Give your address and the landmark nearest to you.",
            urgency: "now",
            type: "call",
            payload: { phone: "112" },
            needs_confirmation: true,
          },
          {
            title: "Arrange backup oxygen or power now",
            detail: "Find a cylinder, a battery backup, or a neighbour on higher ground with power.",
            urgency: "now",
            type: "info",
            payload: {},
            needs_confirmation: false,
          },
          {
            title: "Message neighbours for help",
            detail: "Sends a drafted WhatsApp message you can review first.",
            urgency: "now",
            type: "message",
            payload: {
              message:
                "Urgent: water is entering our house. Aaji is on an oxygen concentrator and we may lose power. Can anyone help move her to higher ground or lend a backup?",
            },
            needs_confirmation: true,
          },
          {
            title: "Call the disaster helpline",
            detail: "1070 can share shelter and rescue information for your area.",
            urgency: "now",
            type: "call",
            payload: { phone: "1070" },
            needs_confirmation: true,
          },
        ],
        contacts: [
          { name: "All emergencies", number: "112", why: "Evacuation and medical help" },
          { name: "Disaster helpline", number: "1070", why: "Shelters and rescue" },
          { name: "Ambulance", number: "108", why: "If breathing gets worse" },
        ],
        health_card: null,
        rumor_verdict: null,
        confidence: 84,
        couldnt_verify: ["Which shelters near you are currently open."],
        critic_notes: ["Confirmed NDMA guidance on electricity during floods."],
        spoken_summary: "Call 112 now and say a patient needs oxygen. Arrange backup power and move to higher ground.",
      },
    },
  },
  {
    id: "rumour",
    label: "Forwarded message",
    tag: "English · text",
    prefill:
      "FORWARDED MANY TIMES: RBI has ordered all ATMs across India to shut for 7 days from Monday for a system upgrade. Withdraw cash TODAY!! Share with family.",
    sample: {
      verified: true,
      sources: [
        { title: "RBI — Press releases", url: "https://www.rbi.org.in/" },
        { title: "PIB Fact Check", url: "https://pib.gov.in/" },
      ],
      signals: [
        { label: "News", value: "No reports of a nationwide ATM shutdown" },
        { label: "Language", value: "English" },
      ],
      card: {
        situation: "A forwarded message claims every ATM in India will shut for 7 days and urges people to withdraw cash today.",
        language_code: "en",
        category: "misinformation",
        risk_level: "moderate",
        risk_reason: "False claims like this can cause panic withdrawals and crowds at ATMs.",
        verified_facts: [
          {
            claim: "RBI has ordered all ATMs to shut for 7 days.",
            source: "No RBI release found",
            status: "contradicted",
          },
          {
            claim: "PIB Fact Check has flagged similar ATM-closure messages before.",
            source: "PIB Fact Check",
            status: "verified",
          },
        ],
        actions: [
          {
            title: "Send the correction to the group",
            detail: "Opens WhatsApp with the correction below, ready to review.",
            urgency: "today",
            type: "message",
            payload: {
              message:
                "This message is false. RBI has not announced any nationwide ATM shutdown. Please check rbi.org.in or PIB Fact Check before forwarding.",
            },
            needs_confirmation: true,
          },
          {
            title: "Check official sources yourself",
            detail: "RBI announcements are published at rbi.org.in.",
            urgency: "this_week",
            type: "info",
            payload: {},
            needs_confirmation: false,
          },
        ],
        contacts: [],
        health_card: null,
        rumor_verdict: {
          verdict: "false",
          correction:
            "RBI has not announced any nationwide ATM shutdown. There is no need to withdraw cash in a hurry. Check rbi.org.in or PIB Fact Check before forwarding such messages.",
        },
        confidence: 91,
        couldnt_verify: [],
        critic_notes: ["Searched RBI press releases for the last 30 days. Nothing matching."],
        spoken_summary: "This forward is false. RBI has not announced any ATM shutdown.",
      },
    },
  },
];
