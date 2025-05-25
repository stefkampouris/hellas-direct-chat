"use client";

import React, { useState } from "react";
import { Star, ThumbsUp, ThumbsDown, MessageSquare, Send } from "lucide-react";

interface EvaluationFormProps {
  sessionId: string;
  caseId?: string;
  onEvaluationSubmitted: () => void;
}

interface EvaluationData {
  rating: number;
  satisfied: boolean | null;
  feedback: string;
  improvements: string[];
}

export default function EvaluationForm({ sessionId, caseId, onEvaluationSubmitted }: EvaluationFormProps) {
  const [evaluation, setEvaluation] = useState<EvaluationData>({
    rating: 0,
    satisfied: null,
    feedback: "",
    improvements: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const improvementOptions = [
    "Πιο γρήγορη απάντηση",
    "Καλύτερη κατανόηση του προβλήματος",
    "Περισσότερες επιλογές λύσεων",
    "Πιο φιλική επικοινωνία",
    "Καλύτερες οδηγίες",
    "Άλλο"
  ];

  const handleStarClick = (rating: number) => {
    setEvaluation(prev => ({ ...prev, rating }));
  };

  const handleSatisfactionClick = (satisfied: boolean) => {
    setEvaluation(prev => ({ ...prev, satisfied }));
  };

  const handleImprovementToggle = (improvement: string) => {
    setEvaluation(prev => ({
      ...prev,
      improvements: prev.improvements.includes(improvement)
        ? prev.improvements.filter(i => i !== improvement)
        : [...prev.improvements, improvement]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/evaluation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          caseId,
          rating: evaluation.rating,
          satisfied: evaluation.satisfied,
          feedback: evaluation.feedback,
          improvements: evaluation.improvements,
          timestamp: new Date().toISOString()
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => {
          onEvaluationSubmitted();
        }, 3000);
      } else {
        console.error('Failed to submit evaluation');
      }
    } catch (error) {
      console.error('Error submitting evaluation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ThumbsUp className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Ευχαριστούμε για την αξιολόγησή σας!
          </h3>
          <p className="text-gray-600 mb-4">
            Η γνώμη σας είναι πολύτιμη για τη βελτίωση των υπηρεσιών μας.
          </p>
          <div className="text-sm text-gray-500">
            Η σελίδα θα ανανεωθεί σε λίγο...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Αξιολογήστε την εμπειρία σας
        </h3>
        <p className="text-gray-600">
          Πώς ήταν η συνομιλία σας με τον AI βοηθό της Hellas Direct;
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Star Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Βαθμολογήστε την εμπειρία σας (1-5 αστέρια)
          </label>
          <div className="flex justify-center space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleStarClick(star)}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= evaluation.rating
                      ? "text-yellow-400 fill-current"
                      : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Satisfaction */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Είστε ικανοποιημένος/η με τη λύση που σας προτάθηκε;
          </label>
          <div className="flex justify-center space-x-4">
            <button
              type="button"
              onClick={() => handleSatisfactionClick(true)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                evaluation.satisfied === true
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              <ThumbsUp className="w-5 h-5" />
              <span>Ναι</span>
            </button>
            <button
              type="button"
              onClick={() => handleSatisfactionClick(false)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                evaluation.satisfied === false
                  ? "bg-red-50 border-red-200 text-red-700"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              <ThumbsDown className="w-5 h-5" />
              <span>Όχι</span>
            </button>
          </div>
        </div>

        {/* Improvements */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Τι θα μπορούσε να βελτιωθεί; (προαιρετικό)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {improvementOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleImprovementToggle(option)}
                className={`p-3 text-sm rounded-lg border transition-colors text-left ${
                  evaluation.improvements.includes(option)
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Feedback */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Επιπλέον σχόλια (προαιρετικό)
          </label>
          <textarea
            value={evaluation.feedback}
            onChange={(e) => setEvaluation(prev => ({ ...prev, feedback: e.target.value }))}
            placeholder="Μοιραστείτε τις σκέψεις σας..."
            rows={4}
            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <button
            type="submit"
            disabled={isSubmitting || evaluation.rating === 0}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            <span>{isSubmitting ? "Αποστολή..." : "Υποβολή αξιολόγησης"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
