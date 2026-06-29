import { VideoCamera } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <VideoCamera size={22} weight="duotone" aria-hidden />
            </div>
            <div>
              <CardTitle className="text-xl">ReuniAI</CardTitle>
              <CardDescription>Inteligência de reuniões</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary">Bootstrap · Onda 0</Badge>
          <p className="mt-4 text-sm text-muted-foreground">
            Plataforma SaaS para transcrever, resumir e extrair action items das suas reuniões.
          </p>
        </CardContent>
        <CardFooter>
          <Button>Começar</Button>
        </CardFooter>
      </Card>
    </main>
  );
}
