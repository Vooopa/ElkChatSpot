import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { normalizeUrl } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox"; // Importazione aggiunta per migliorare l'accessibilità

export default function EmbedCode() {
  const [url, setUrl] = useState("");
  const [normalizedUrl, setNormalizedUrl] = useState("");
  const [width, setWidth] = useState("350px");
  const [height, setHeight] = useState("500px");
  const [position, setPosition] = useState<"bottom-right" | "bottom-left" | "top-right" | "top-left">("bottom-right");
  const [title, setTitle] = useState("Chat");
  const [autoOpen, setAutoOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Validazione per dimensioni
  const validateDimension = (value: string): boolean => {
    // Accetta valori come "350px", "100%", "20em", "10rem", ecc.
    return /^[0-9]+(px|%|em|rem|vh|vw)$/.test(value);
  };

  // Update normalized URL when URL changes
  useEffect(() => {
    try {
      setError(null);
      if (url.trim()) {
        setNormalizedUrl(normalizeUrl(url));
      } else {
        setNormalizedUrl("");
      }
    } catch (error) {
      setNormalizedUrl("");
      setError("Impossibile elaborare l'URL. Assicurati che sia un URL valido.");
    }
  }, [url]);

  const getEmbedCode = () => {
    if (!normalizedUrl && url.trim()) {
      return `<!-- Inserisci un URL valido per generare il codice di incorporamento -->`;
    }

    return `<script 
  src="${window.location.origin}/widget/chat-widget.js" 
  data-chat-widget-url="${normalizedUrl || window.location.origin}"
  data-chat-widget-auto="${autoOpen}" 
  data-chat-widget-position="${position}"
  data-chat-widget-title="${title}"
  data-chat-widget-open="${autoOpen}"
  data-chat-widget-width="${width}"
  data-chat-widget-height="${height}"
></script>`;
  };

  const getJavaScriptCode = () => {
    if (!normalizedUrl && url.trim()) {
      return `// Inserisci un URL valido per generare il codice JavaScript`;
    }

    return `// Inizializza il widget di chat
const chatWidget = new ChatWidget({
  url: '${normalizedUrl || window.location.origin}',
  position: '${position}',
  title: '${title}',
  initiallyOpen: ${autoOpen},
  width: '${width}',
  height: '${height}'
});

// Puoi controllare programmaticamente il widget
// chatWidget.open();
// chatWidget.close();
// chatWidget.toggle();`;
  };

  const updateWidth = (value: string) => {
    setWidth(value);
    if (!validateDimension(value)) {
      toast({
        title: "Formato dimensione non valido",
        description: "Usa un formato come '350px', '100%', '20em', ecc.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const updateHeight = (value: string) => {
    setHeight(value);
    if (!validateDimension(value)) {
      toast({
        title: "Formato dimensione non valido",
        description: "Usa un formato come '350px', '100%', '20em', ecc.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copiato negli appunti!",
        description: "Il codice di incorporamento è stato copiato negli appunti.",
        duration: 3000,
      });
    }).catch(err => {
      console.error('Impossibile copiare: ', err);
      toast({
        title: "Impossibile copiare",
        description: "Prova a selezionare il codice e copiarlo manualmente.",
        variant: "destructive",
        duration: 3000,
      });
    });
  };

  return (
      <div className="container max-w-4xl py-8">
        <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Ottieni il tuo codice di incorporamento per il Widget di Chat
        </h1>

        <p className="text-lg mb-8">
          Aggiungi funzionalità di chat in tempo reale a qualsiasi pagina web con il nostro widget facile da integrare.
          Gli utenti che navigano sulla stessa pagina possono chattare tra loro, creando una comunità attorno ai tuoi contenuti.
        </p>

        <div className="grid gap-8 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Configura il tuo Widget</CardTitle>
              <CardDescription>
                Personalizza come apparirà il widget di chat sul tuo sito web
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label htmlFor="url" className="block text-sm font-medium mb-1">
                    URL del sito web (opzionale)
                  </label>
                  <Input
                      id="url"
                      placeholder="https://example.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      aria-invalid={error ? "true" : "false"}
                  />
                  {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
                  <p className="text-sm text-gray-500 mt-1">
                    Questo verrà utilizzato per creare una chat room specifica per questo URL
                  </p>
                </div>

                <div>
                  <label htmlFor="title" className="block text-sm font-medium mb-1">
                    Titolo del Widget
                  </label>
                  <Input
                      id="title"
                      placeholder="Chat"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="width" className="block text-sm font-medium mb-1">
                      Larghezza
                    </label>
                    <Input
                        id="width"
                        placeholder="350px"
                        value={width}
                        onChange={(e) => updateWidth(e.target.value)}
                        aria-describedby="width-format"
                    />
                    <p id="width-format" className="text-xs text-gray-500 mt-1">
                      Formato: 350px, 100%, 20em, ecc.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="height" className="block text-sm font-medium mb-1">
                      Altezza
                    </label>
                    <Input
                        id="height"
                        placeholder="500px"
                        value={height}
                        onChange={(e) => updateHeight(e.target.value)}
                        aria-describedby="height-format"
                    />
                    <p id="height-format" className="text-xs text-gray-500 mt-1">
                      Formato: 500px, 100%, 20em, ecc.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Posizione del Widget
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                        type="button"
                        variant={position === "top-left" ? "default" : "outline"}
                        className="flex items-center justify-center"
                        onClick={() => setPosition("top-left")}
                    >
                      In alto a sinistra
                    </Button>
                    <Button
                        type="button"
                        variant={position === "top-right" ? "default" : "outline"}
                        className="flex items-center justify-center"
                        onClick={() => setPosition("top-right")}
                    >
                      In alto a destra
                    </Button>
                    <Button
                        type="button"
                        variant={position === "bottom-left" ? "default" : "outline"}
                        className="flex items-center justify-center"
                        onClick={() => setPosition("bottom-left")}
                    >
                      In basso a sinistra
                    </Button>
                    <Button
                        type="button"
                        variant={position === "bottom-right" ? "default" : "outline"}
                        className="flex items-center justify-center"
                        onClick={() => setPosition("bottom-right")}
                    >
                      In basso a destra
                    </Button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                      id="autoOpen"
                      checked={autoOpen}
                      onCheckedChange={(checked) => setAutoOpen(checked === true)}
                  />
                  <label htmlFor="autoOpen" className="text-sm font-medium cursor-pointer">
                    Apri widget automaticamente quando la pagina si carica
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Il tuo codice di incorporamento</CardTitle>
              <CardDescription>
                Copia e incolla questo codice nell'HTML del tuo sito web
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="html">
                <TabsList className="mb-4">
                  <TabsTrigger value="html">HTML Embed</TabsTrigger>
                  <TabsTrigger value="js">JavaScript</TabsTrigger>
                </TabsList>
                <TabsContent value="html">
                  <div className="relative">
                  <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-x-auto">
                    {getEmbedCode()}
                  </pre>
                    <Button
                        size="sm"
                        onClick={() => copyToClipboard(getEmbedCode())}
                        className="absolute top-2 right-2"
                    >
                      Copia
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="js">
                  <div className="relative">
                  <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-x-auto">
                    {getJavaScriptCode()}
                  </pre>
                    <Button
                        size="sm"
                        onClick={() => copyToClipboard(getJavaScriptCode())}
                        className="absolute top-2 right-2"
                    >
                      Copia
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex flex-col items-start">
              <p className="text-sm text-gray-500 mb-2">
                Posiziona il codice di incorporamento nella sezione <code>&lt;body&gt;</code> del tuo HTML, preferibilmente vicino alla fine prima del tag <code>&lt;/body&gt;</code>.
              </p>
              <Button
                  variant="outline"
                  onClick={() => window.open('/public/demo.html', '_blank')}
              >
                Visualizza pagina demo
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
  );
}