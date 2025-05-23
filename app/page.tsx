"use client";

import Image from "next/image";
import { useState } from "react";

// Dialogflow integration
async function sendToDialogflow(message: string) {
  // Replace with your Dialogflow project details and endpoint
  // This is a demo using Dialogflow CX REST API v3 (for production use, secure your credentials!)
  const projectId = "YOUR_PROJECT_ID";
  const location = "global"; // or your Dialogflow agent location
  const agentId = "YOUR_AGENT_ID";
  const sessionId = typeof window !== 'undefined' ? (window.crypto?.randomUUID?.() || Math.random().toString(36).substring(2)) : Math.random().toString(36).substring(2);
  const endpoint = `https://dialogflow.googleapis.com/v3/projects/${projectId}/locations/${location}/agents/${agentId}/sessions/${sessionId}:detectIntent`;

  // You need to provide a valid OAuth2 access token for Dialogflow CX
  const accessToken = "YOUR_ACCESS_TOKEN";

  const body = {
    queryInput: {
      text: {
        text: message,
      },
      languageCode: "el"
    }
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error("Dialogflow request failed");
  const data = await res.json();
  // Extract the response text
  return data.queryResult?.responseMessages?.[0]?.text?.text?.[0] || "";
}

// Mock backend logic based on your prompt
function analyzeMessage(message: string, caseData: any) {
  const msg = message.toLowerCase();
  // Simple keyword-based detection (expand as needed)
  const acKeywords = [
    "τρακάρισμα", "ατύχημα", "χτύπημα", "σπασμένο", "ζημιά", "παρμπρίζ", "σταθμευμένο", "εξωτερικό παράγοντα"
  ];
  const raKeywords = [
    "λάστιχο", "βενζίνη", "μπαταρία", "βλάβη", "δεν ξεκινάει", "σταμάτησε", "οδική", "βοήθεια", "ρεζέρβα"
  ];
  const fastTrackKeywords = ["πίσω", "σταθμευμένο", "stop", "σήμανση", "ξεπαρκάρισμα", "όπισθεν", "άνοιγμα θύρας"];
  const fraudKeywords = ["γνωριμία", "ασυμβατότητα", "έναρξη συμβολαίου"];
  const geolocKeywords = ["εθνική οδός", "άγνωστη τοποθεσία", "διπλότυπο όνομα"];
  const delayKeywords = ["ώρα αναμονής", "περίμενα πάνω από μία ώρα", "καθυστέρηση"]; // simplistic
  const notAccessibleKeywords = ["υπόγειο γκαράζ", "μη προσβάσιμο"]; // simplistic

  let type = caseData.type || null;
  if (!type) {
    if (acKeywords.some(k => msg.includes(k))) type = "AC";
    else if (raKeywords.some(k => msg.includes(k))) type = "RA";
    else type = "OTHER";
  }

  // Collect data
  let newCaseData = { ...caseData };
  // Must-have fields
  if (/\b(ονομα|ονόμα|λέγομαι|με λένε|είμαι)\b/.test(msg)) newCaseData.customerName = message;
  if (/\b(αριθμός κυκλοφορίας|πινακίδα|κυκλοφορίας)\b/.test(msg)) newCaseData.registrationNumber = message;
  if (/\b(τοποθεσία|βρίσκομαι|είμαι στο|είμαι στην|είμαι στον)\b/.test(msg)) newCaseData.location = message;
  if (/\b(περιστατικό|συνέβη|έγινε|τι συνέβη|τι έγινε)\b/.test(msg)) newCaseData.description = message;
  if (/\b(συνεργείο|οικία|προορισμός|θέλω να πάω|τελικός προορισμός)\b/.test(msg)) newCaseData.finalDestination = message;

  // Decision logic
  if (type === "AC") {
    // Fast Track
    if (fastTrackKeywords.some(k => msg.includes(k))) newCaseData.fastTrack = true;
    // Fraud
    if (fraudKeywords.some(k => msg.includes(k))) newCaseData.fraud = true;
  }
  if (type === "RA") {
    // Possible malfunction
    if (raKeywords.some(k => msg.includes(k))) newCaseData.possibleMalfunction = message;
  }
  // Delay coupon
  if (delayKeywords.some(k => msg.includes(k))) newCaseData.delayCoupon = true;
  // Geolocation link
  if (geolocKeywords.some(k => msg.includes(k))) newCaseData.geolocLink = true;
  // Not accessible
  if (notAccessibleKeywords.some(k => msg.includes(k))) newCaseData.notAccessible = true;

  // Compose bot reply
  let reply: string[] = [];
  if (type === "AC") {
    if (!newCaseData.location) reply.push("Πού ακριβώς βρίσκεστε;");
    else if (!newCaseData.customerName) reply.push("Μπορείτε να μου δώσετε το ονοματεπώνυμό σας;");
    else if (!newCaseData.registrationNumber) reply.push("Ποιος είναι ο αριθμός κυκλοφορίας του οχήματός σας;");
    else if (!newCaseData.description) reply.push("Πώς ακριβώς συνέβη το περιστατικό;");
    else if (!newCaseData.finalDestination) reply.push("Σε περίπτωση που το όχημα δεν μπορεί να μετακινηθεί, ποιος θα θέλατε να είναι ο τελικός του προορισμός;");
    else if (!newCaseData.injuryAsked) {
      reply.push("Είστε όλοι εντάξει; Υπάρχει κάποιος τραυματισμός;");
      newCaseData.injuryAsked = true;
    } else if (!newCaseData.damageAsked) {
      reply.push("Τι υλικές ζημιές έχετε στο όχημά σας; Πού βρίσκονται;");
      newCaseData.damageAsked = true;
    } else if (!newCaseData.insuranceAsked) {
      reply.push("Ποια είναι η ασφαλιστική εταιρία του εμπλεκόμενου οχήματος;");
      newCaseData.insuranceAsked = true;
    } else if (!newCaseData.photosAsked) {
      reply.push("Μπορείτε να στείλετε φωτογραφίες της άδειας κυκλοφορίας, του διπλώματός σας, των ζημιών και του σημείου του συμβάντος;");
      newCaseData.photosAsked = true;
    } else {
      // Summary
      reply.push("Σας ευχαριστούμε. Ακολουθεί σύνοψη του περιστατικού:");
      reply.push(JSON.stringify({
        RegistrationNumber: newCaseData.registrationNumber || "-",
        CustomerName: newCaseData.customerName || "-",
        Description: newCaseData.description || "-",
        Location: newCaseData.location || "-",
        FinalDestination: newCaseData.finalDestination || "-",
        FastTrack: !!newCaseData.fastTrack,
        Fraud: !!newCaseData.fraud
      }, null, 2));
    }
  } else if (type === "RA") {
    if (!newCaseData.location) reply.push("Πού ακριβώς βρίσκεστε;");
    else if (!newCaseData.customerName) reply.push("Μπορείτε να μου δώσετε το ονοματεπώνυμό σας;");
    else if (!newCaseData.registrationNumber) reply.push("Ποιος είναι ο αριθμός κυκλοφορίας του οχήματός σας;");
    else if (!newCaseData.description) reply.push("Τι συνέβη στο όχημα;");
    else if (!newCaseData.reserveAsked) {
      reply.push("Υπάρχει ρεζέρβα στο όχημα;");
      newCaseData.reserveAsked = true;
    } else if (!newCaseData.directionAsked) {
      reply.push("Προς τα πού είχατε κατεύθυνση;");
      newCaseData.directionAsked = true;
    } else if (!newCaseData.colorAsked) {
      reply.push("Τι χρώμα είναι το αυτοκίνητο;");
      newCaseData.colorAsked = true;
    } else if (!newCaseData.repairShopAsked) {
      reply.push("Υπάρχει κάποιο συγκεκριμένο βουλκανιζατέρ/συνεργείο που θα θέλατε να πάμε;");
      newCaseData.repairShopAsked = true;
    } else if (!newCaseData.finalDestination) {
      reply.push("Σε περίπτωση που το όχημα δεν μπορεί να μετακινηθεί, ποιος θα θέλατε να είναι ο τελικός του προορισμός;");
    } else {
      // Summary
      reply.push("Σας ευχαριστούμε. Ακολουθεί σύνοψη του περιστατικού:");
      reply.push(JSON.stringify({
        RegistrationNumber: newCaseData.registrationNumber || "-",
        CustomerName: newCaseData.customerName || "-",
        Description: newCaseData.description || "-",
        Location: newCaseData.location || "-",
        FinalDestination: newCaseData.finalDestination || "-",
        PossibleMalfunction: newCaseData.possibleMalfunction || "-",
        DelayCoupon: !!newCaseData.delayCoupon,
        GeolocLink: !!newCaseData.geolocLink,
        NotAccessible: !!newCaseData.notAccessible
      }, null, 2));
    }
  } else {
    reply.push("Ευχαριστώ, εξυπηρετώ μόνο Ατυχήματα και Οδική Βοήθεια.");
  }
  return { type, reply, caseData: newCaseData };
}

export default function Home() {
  const [messages, setMessages] = useState<{ from: "user" | "bot"; text: string }[]>(
    [
      {
        from: "bot",
        text: "👋 Καλώς ήρθατε! Εξυπηρετώ μόνο Ατυχήματα (AC) και Οδική Βοήθεια (RA). Περιγράψτε το περιστατικό σας για να ξεκινήσουμε."
      }
    ]
  );
  const [input, setInput] = useState("");
  const [caseData, setCaseData] = useState<any>({});

  function handleUserMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages(msgs => [...msgs, { from: "user", text: userMsg }]);
    setInput("");
    sendToDialogflow(userMsg)
      .then(botReply => {
        setMessages(msgs => [...msgs, { from: "bot", text: botReply || "(Δεν ελήφθη απάντηση από Dialogflow)" }]);
      })
      .catch(() => {
        setMessages(msgs => [...msgs, { from: "bot", text: "Σφάλμα σύνδεσης με Dialogflow." }]);
      });
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col items-center justify-center border border-blue-100">
        <span className="font-bold text-2xl text-blue-700 mb-4">Hellas Direct Chatbot</span>
        <div className="flex-1 w-full overflow-y-auto text-sm mb-6 px-1" style={{ maxHeight: '40vh' }}>
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.from === "user"
                  ? "text-right mb-1"
                  : "text-left mb-1 text-blue-700"
              }
            >
              <span
                className={
                  m.from === "user"
                    ? "inline-block bg-blue-100 rounded-lg px-3 py-2 text-base shadow"
                    : "inline-block bg-gray-100 rounded-lg px-3 py-2 text-base shadow"
                }
              >
                {m.text}
              </span>
            </div>
          ))}
        </div>
        <form className="flex w-full gap-2 items-center justify-center" onSubmit={handleUserMessage}>
          <input
            id="chat-input"
            className="flex-1 border-2 border-blue-300 focus:border-blue-500 rounded-full px-4 py-3 text-base shadow-sm transition outline-none bg-blue-50 placeholder-blue-400"
            type="text"
            placeholder="Γράψτε το μήνυμά σας..."
            value={input}
            onChange={e => setInput(e.target.value)}
            autoFocus
          />
          <button
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-700 text-white px-5 py-3 rounded-full font-semibold shadow-md hover:from-blue-600 hover:to-blue-800 transition text-base"
            type="submit"
            aria-label="Αποστολή μηνύματος"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12l15-6m0 0l-6 15m6-15L9.75 9.75" />
            </svg>
            Αποστολή
          </button>
        </form>
        <div className="text-xs text-gray-400 mt-4">
          * Demo. Τα δεδομένα δεν αποστέλλονται σε server.
        </div>
      </div>
    </div>
  );
}