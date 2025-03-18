import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { normalizeUrl } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function EmbedCode() {
  const [url, setUrl] = useState("");
  const [normalizedUrl, setNormalizedUrl] = useState("");
  const [width, setWidth] = useState("350px");
  const [height, setHeight] = useState("500px");
  const [position, setPosition] = useState<"bottom-right" | "bottom-left" | "top-right" | "top-left">("bottom-right");
  const [title, setTitle] = useState("Chat");
  const [autoOpen, setAutoOpen] = useState(false);
  const { toast } = useToast();

  // Update normalized URL when URL changes
  useEffect(() => {
    try {
      if (url.trim()) {
        setNormalizedUrl(normalizeUrl(url));
      } else {
        setNormalizedUrl("");
      }
    } catch (error) {
      setNormalizedUrl("");
    }
  }, [url]);

  const getEmbedCode = () => {
    if (!normalizedUrl) {
      return `<!-- Please enter a valid URL to generate embed code -->`;
    }

    return `<script 
  src="${window.location.origin}/widget/chat-widget.js" 
  data-chat-widget-auto="true" 
  data-chat-widget-position="${position}"
  data-chat-widget-title="${title}"
  data-chat-widget-open="${autoOpen}"
  data-chat-widget-width="${width}"
  data-chat-widget-height="${height}"
></script>`;
  };

  const getJavaScriptCode = () => {
    if (!normalizedUrl) {
      return `// Please enter a valid URL to generate JavaScript code`;
    }

    return `// Initialize the chat widget
const chatWidget = new ChatWidget({
  position: '${position}',
  title: '${title}',
  initiallyOpen: ${autoOpen},
  width: '${width}',
  height: '${height}'
});

// You can programmatically control the widget
// chatWidget.open();
// chatWidget.close();
// chatWidget.toggle();`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied to clipboard!",
        description: "The embed code has been copied to your clipboard.",
        duration: 3000,
      });
    }).catch(err => {
      console.error('Failed to copy: ', err);
      toast({
        title: "Failed to copy",
        description: "Please try selecting the code and copying manually.",
        variant: "destructive",
        duration: 3000,
      });
    });
  };

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
        Get Your Chat Widget Embed Code
      </h1>
      
      <p className="text-lg mb-8">
        Add real-time chat functionality to any webpage with our easy-to-integrate widget.
        Users browsing the same page can chat with each other, creating a community around your content.
      </p>
      
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configure Your Widget</CardTitle>
            <CardDescription>
              Customize how the chat widget will appear on your website
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label htmlFor="url" className="block text-sm font-medium mb-1">
                  Website URL (optional)
                </label>
                <Input
                  id="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <p className="text-sm text-gray-500 mt-1">
                  This will be used to create a chat room specific to this URL
                </p>
              </div>
              
              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-1">
                  Widget Title
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
                    Width
                  </label>
                  <Input
                    id="width"
                    placeholder="350px"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="height" className="block text-sm font-medium mb-1">
                    Height
                  </label>
                  <Input
                    id="height"
                    placeholder="500px"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Widget Position
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={position === "top-left" ? "default" : "outline"}
                    className="flex items-center justify-center"
                    onClick={() => setPosition("top-left")}
                  >
                    Top Left
                  </Button>
                  <Button
                    type="button"
                    variant={position === "top-right" ? "default" : "outline"}
                    className="flex items-center justify-center"
                    onClick={() => setPosition("top-right")}
                  >
                    Top Right
                  </Button>
                  <Button
                    type="button"
                    variant={position === "bottom-left" ? "default" : "outline"}
                    className="flex items-center justify-center"
                    onClick={() => setPosition("bottom-left")}
                  >
                    Bottom Left
                  </Button>
                  <Button
                    type="button"
                    variant={position === "bottom-right" ? "default" : "outline"}
                    className="flex items-center justify-center"
                    onClick={() => setPosition("bottom-right")}
                  >
                    Bottom Right
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoOpen"
                  checked={autoOpen}
                  onChange={(e) => setAutoOpen(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="autoOpen" className="text-sm font-medium">
                  Open widget automatically when page loads
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Your Embed Code</CardTitle>
            <CardDescription>
              Copy and paste this code into your website's HTML
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
                    Copy
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
                    Copy
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col items-start">
            <p className="text-sm text-gray-500 mb-2">
              Place the embed code in the <code>&lt;body&gt;</code> section of your HTML, preferably near the end before the closing <code>&lt;/body&gt;</code> tag.
            </p>
            <Button
              variant="outline"
              onClick={() => window.open('/public/demo.html', '_blank')}
            >
              View Demo Page
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}