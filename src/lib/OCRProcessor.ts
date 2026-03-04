/**
 * Intelligent OCR Engine for YOLO
 * Optimized for Student ID Cards
 */

export interface ExtractedStudentData {
    full_name?: string;
    roll_number?: string;
    college?: string;
    department?: string;
    year?: string;
}

export async function processIDCard(imageSrc: string): Promise<ExtractedStudentData> {
    if (typeof window === 'undefined') return {};

    try {
        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker('eng');

        // Optimize for clear text OCR
        const { data: { text } } = await worker.recognize(imageSrc);
        await worker.terminate();

        console.log('🔍 YOLO OCR Raw:', text);

        const data: ExtractedStudentData = {};

        // 1. ROBUST ROLL NUMBER DETECTION (Expanded dictionary)
        const rollPatterns = [
            /\d{2}[A-Z]{2,}\d+/i,                      // 21CS101 (Classic)
            /(Roll|Reg|Register|Univ|ID|Adm)\s*(No|Num|Number)?[:.\s]*([A-Z0-9.\-/]+)/i, // Labels
            /\b[A-Z]{2,}\d{4,}\b/i,                    // Direct match like CS2021005
            /\b\d{6,12}\b/                             // Pure numeric IDs
        ];
        for (const p of rollPatterns) {
            const match = text.match(p);
            if (match) {
                data.roll_number = (match[3] || match[0]).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
                break;
            }
        }

        // 2. FUZZY NAME DETECTION (Improved for diverse layouts)
        const nameMatch = text.match(/(Name|Student|Full Name|Nom)[:.\s]*([a-zA-Z\s]{3,})/i);
        if (nameMatch) {
            data.full_name = nameMatch[2].trim().split('\n')[0];
        } else {
            // Logic for floating names: Look for the first line that is predominantly uppercase and 2+ words
            const lines = text.split('\n')
                .map(l => l.trim())
                .filter(l => l.length > 5 && !l.includes('STUDENT') && !l.includes('UNIVERSITY') && !l.includes('COLLEGE'));

            const probableName = lines.find(l => /^[A-Z\s.]+$/.test(l));
            if (probableName) {
                data.full_name = probableName;
            } else if (lines.length > 0) {
                data.full_name = lines[0];
            }
        }

        // 3. DEPARTMENT / COURSE DETECTION (Added 'PROG' for Hindustan University)
        const deptPatterns = [
            /(Dept|Department|Stream|Branch|Course|Major|Degree|Prog|Program)[:.\s]*([a-zA-Z\s\-\/\&]+)/i,
            /\b(B\.E|B\.TECH|B\.SC|MCA|MBA|BCA|ME|COMSCI)\b/i
        ];
        for (const p of deptPatterns) {
            const match = text.match(p);
            if (match) {
                // Return full match for Prog if specific course is listed
                data.department = (match[2] || match[0]).trim().split('\n')[0];
                break;
            }
        }

        // 4. INSTITUTION DETECTION (Tuned for Hindustan University)
        const collegePatterns = [
            /HINDUSTAN\s*(UNIVERSITY|INSTITUTE|COLLEGE)/i,
            /H\.I\.T\.S/i,
            /H\.I\.E\.T/i,
            /(College|University|Institute|School|Engineering|Technology|Polytechnic)[:.\s]*([a-zA-Z\s]+)/i,
            /\b[A-Z\s]{5,}(INSTITUTE|COLLEGE|UNIVERSITY)\b/i
        ];
        for (const p of collegePatterns) {
            const match = text.match(p);
            if (match) {
                if (text.toLowerCase().includes('hindustan')) {
                    data.college = "Hindustan University";
                } else {
                    data.college = (match[2] || match[0]).trim().split('\n')[0];
                }
                break;
            }
        }

        // 5. YEAR DETECTION (Multi-format)
        const yearMatch = text.match(/(Year|Yr|Level|Sem)[:.\s]*(1st|2nd|3rd|4th|I|II|III|IV|V|VI|VII|VIII|\d)/i);
        if (yearMatch) {
            let y = yearMatch[2].trim().toUpperCase();
            if (y.includes('1') || y === 'I') data.year = '1';
            else if (y.includes('2') || y === 'II') data.year = '2';
            else if (y.includes('3') || y === 'III') data.year = '3';
            else if (y.includes('4') || y === 'IV') data.year = '4';
            else data.year = y;
        }

        return data;
    } catch (err) {
        console.error('❌ OCR Error:', err);
        return {};
    }
}
