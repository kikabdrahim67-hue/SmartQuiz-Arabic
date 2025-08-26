import { GoogleGenAI, Type } from "@google/genai";
import type { Question, Difficulty } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * Cleans the raw text response from the Gemini API.
 * It removes markdown code fences (```json ... ```) and other potential noise.
 * @param text The raw text from the API response.
 * @returns A cleaned string that is likely valid JSON.
 */
function cleanJsonString(text: string): string {
    // Handle cases where the API might return a non-string or empty response
    if (typeof text !== 'string' || !text) {
        return "";
    }
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.substring(7);
    }
    if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.substring(0, cleanedText.length - 3);
    }
    // Handle cases where the response might be wrapped in ``` without the json tag
    if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.substring(3);
    }
    return cleanedText.trim();
}

export async function generateQuestions(category: string, count: number, difficulty: Difficulty): Promise<Question[]> {
  try {
    let difficultyInstruction = `صنّف كل سؤال حسب الصعوبة ('سهل'، 'متوسط'، 'صعب'). يجب أن يكون هناك تنوع في مستويات الصعوبة.`;
    if (difficulty !== 'متغير') {
        difficultyInstruction = `يجب أن يكون مستوى صعوبة كل الأسئلة هو '${difficulty}' بالضبط.`;
    }

    const prompt = `
      أنت خبير في إنشاء اختبارات دقيقة وموثوقة. استخدم بحث Google للتحقق من جميع المعلومات قبل إنشاء الأسئلة. الدقة هي الأولوية القصوى.
      
      أنشئ ${count} سؤال اختبار فريد ومتنوع باللغة العربية حول موضوع "${category}".
      
      يجب أن تتبع القواعد التالية بدقة:
      1.  لكل سؤال 4 خيارات، إجابة واحدة صحيحة فقط.
      2.  يجب تقديم شرح موجز وواضح للإجابة الصحيحة.
      3.  ${difficultyInstruction}
      4.  تجنب الأسئلة الغامضة أو التي تعتمد على الرأي.
      5.  يجب أن يكون الناتج النهائي عبارة عن مصفوفة JSON صالحة ومباشرة بدون أي نص إضافي أو علامات markdown.
      
      يجب أن يتبع هيكل JSON لكل سؤال التنسيق التالي بدقة:
      {
        "prompt": "نص السؤال",
        "choices": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
        "answerIndex": 0,
        "explanation": "شرح الإجابة",
        "difficulty": "سهل"
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        temperature: 0.5, // Lower temperature for more factual answers
        tools: [{googleSearch: {}}],
      },
    });

    const jsonText = cleanJsonString(response.text);
    const generatedQuestions: Omit<Question, 'id' | 'sources'>[] = JSON.parse(jsonText);

    if (!Array.isArray(generatedQuestions) || generatedQuestions.length === 0) {
      throw new Error("AI returned invalid data format.");
    }
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
        .map((chunk: any) => chunk.web)
        .filter((web: any) => web && web.uri)
        .map((web: any) => ({ uri: web.uri, title: web.title || web.uri }));
    
    const uniqueSources = Array.from(new Map(sources.map(s => [s.uri, s])).values());

    return generatedQuestions.map((q, index) => ({ 
      ...q, 
      id: `${category}-${index}-${Date.now()}`,
      sources: uniqueSources.length > 0 ? uniqueSources : undefined
    }));

  } catch (error) {
    console.error("Error generating questions from Gemini API:", error);
     if (error instanceof SyntaxError) {
        throw new Error("فشل الذكاء الاصطناعي في إنشاء أسئلة بتنسيق صحيح. حاول مرة أخرى.");
    }
    throw new Error("فشل في إنشاء الأسئلة من الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.");
  }
}

export async function generateSmartHint(question: Question): Promise<string> {
    try {
        const prompt = `
            أنت مساعد ذكي في لعبة اختبارات. مهمتك هي تقديم تلميح ذكي لسؤال الاختيار من متعدد التالي.
            
            **قواعد التلميح:**
            1.  يجب أن يكون التلميح باللغة العربية.
            2.  يجب أن يكون التلميح قصيراً جداً (جملة واحدة فقط).
            3.  **الأهم:** يجب ألا يكشف التلميح الإجابة الصحيحة بشكل مباشر. يجب أن يوجه اللاعب للتفكير في الاتجاه الصحيح فقط.
            4.  تجنب تكرار الكلمات الموجودة في السؤال أو الإجابة الصحيحة.
            
            **السؤال:**
            "${question.prompt}"
            
            **الخيارات:**
            - ${question.choices.join('\n- ')}
            
            **الإجابة الصحيحة هي:**
            "${question.choices[question.answerIndex]}"
            
            **مثال على تلميح جيد:**
            - لسؤال "ما هي عاصمة أستراليا؟" (الإجابة: كانبرا)، تلميح جيد قد يكون: "العاصمة ليست أكبر أو أشهر مدينة في البلاد."
            
            **مثال على تلميح سيء (يكشف الإجابة):**
            - "تبدأ بحرف الكاف."
            
            الآن، أنشئ تلميحاً ذكياً للسؤال المحدد.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.7,
                thinkingConfig: { thinkingBudget: 0 },
                maxOutputTokens: 50,
            },
        });
        
        const hintText = response.text;
        if (typeof hintText !== 'string' || !hintText.trim()) {
            throw new Error("AI returned an empty hint.");
        }

        return hintText.trim();

    } catch (error) {
        console.error("Error generating smart hint from Gemini API:", error);
        throw new Error("فشل الذكاء الاصطناعي في إنشاء تلميح. حاول مرة أخرى.");
    }
}

export async function generateFunFact(question: Question): Promise<string> {
    try {
        const prompt = `
            أنت مساعد ذكي ومرح. مهمتك هي تقديم حقيقة علمية أو معلومة ممتعة وقصيرة جدًا (جملة واحدة فقط) تكون مرتبطة بموضوع السؤال التالي.
            
            **قواعد المعلومة:**
            1.  يجب أن تكون المعلومة باللغة العربية.
            2.  يجب أن تكون قصيرة ومباشرة (جملة واحدة).
            3.  **الأهم:** يجب أن تكون المعلومة مختلفة عن "شرح الإجابة" الموجود، وتقدم زاوية جديدة أو تفصيلاً مثيراً للاهتمام.
            4.  لا تبدأ بـ "هل تعلم أن". ابدأ بالمعلومة مباشرة.

            **موضوع السؤال:**
            "${question.prompt}"
            
            **الإجابة الصحيحة (للسياق):**
            "${question.choices[question.answerIndex]}"
            
            **شرح الإجابة (الذي يجب تجنب تكراره):**
            "${question.explanation}"

            **مثال على معلومة جيدة:**
            - لموضوع سؤال عن "نهر النيل"، معلومة جيدة قد تكون: "يُعتقد أن تماسيح النيل كانت مصدر إلهام لبعض الآلهة المصرية القديمة."

            الآن، أنشئ معلومة ممتعة ومختلفة للسؤال المحدد.
        `;
        
        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: prompt,
            config: {
                temperature: 0.8,
                thinkingConfig: { thinkingBudget: 0 },
                maxOutputTokens: 70,
            },
        });
        
        const factText = response.text;
        if (typeof factText !== 'string' || !factText.trim()) {
            throw new Error("AI returned an empty fact.");
        }

        return factText.trim();

    } catch (error) {
        console.error("Error generating fun fact from Gemini API:", error);
        // Return a generic fallback so the UI doesn't break
        return "لم نتمكن من العثور على حقيقة ممتعة في الوقت الحالي.";
    }
}
