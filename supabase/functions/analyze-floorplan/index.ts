import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imageUrl, storeId } = await req.json();
    console.log('Analyzing floorplan for store:', storeId, 'Image URL:', imageUrl);

    if (!imageUrl || !storeId) {
      throw new Error('imageUrl and storeId are required');
    }

    // Analyze the floorplan image using AI
    console.log('Calling AI gateway...');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analiziraj ovaj tlocrt prodavnice i pročitaj sve pozicije koje se nalaze na njemu.
                
Za svaku poziciju mi treba:
- position_number: broj/oznaka pozicije (npr. "A1", "B1", "002", "003")
- x: horizontalna pozicija u postocima (0-100) gdje se nalazi u odnosu na sliku
- y: vertikalna pozicija u postocima (0-100) gdje se nalazi u odnosu na sliku
- width: širina elementa u postocima (procijeni na osnovu veličine na slici, npr. 8-15)
- height: visina elementa u postocima (procijeni na osnovu veličine na slici, npr. 6-12)
- status: ako je pozicija zelena, status je "free", ako je crvena ili pink, status je "occupied"
- confidence: procenat sigurnosti u detekciju (0-100), obzirom na jasnoću oznake i boje

Također, na osnovu position_number-a odredi tip:
- Ako počinje sa A ili je polica: format="Polica", display_type="Standardni", width=12, height=8
- Ako počinje sa B ili je kraća polica: format="Polica", display_type="Kompaktni", width=9, height=8
- Ako počinje sa C ili je vitrina: format="Vitrina", display_type="Rashladna", width=15, height=10
- Za brojčane oznake: format="Displej", display_type="Zidni", width=10, height=8

Na kraju, procijeni i vrati ukupnu tačnost detekcije (overall_confidence) od 0-100.

Vrati SAMO JSON u formatu:
{
  "overall_confidence": 85,
  "positions": [
    {
      "position_number": "002",
      "x": 25.5,
      "y": 15.2,
      "width": 10,
      "height": 8,
      "status": "free",
      "format": "Displej",
      "display_type": "Zidni",
      "confidence": 90
    },
    ...
  ]
}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('AI API error:', response.status, error);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('AI response received');
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response');
      throw new Error('No response from AI');
    }
    
    console.log('Parsing AI response...');

    // Extract JSON from response (handle markdown code blocks)
    let result;
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                       content.match(/\{[\s\S]*"positions"[\s\S]*\}/);
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      result = JSON.parse(jsonString);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate response structure
    if (!result.positions || !Array.isArray(result.positions)) {
      console.error('Invalid AI response structure:', result);
      throw new Error('AI response missing positions array');
    }

    console.log(`Successfully detected ${result.positions.length} positions with ${result.overall_confidence}% confidence`);

    return new Response(
      JSON.stringify({ 
        positions: result.positions,
        overall_confidence: result.overall_confidence || 75
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in analyze-floorplan:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
