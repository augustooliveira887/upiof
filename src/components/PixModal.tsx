import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, QrCode, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import QRCode from "qrcode";

interface PixModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PixResponse {
  pix: {
    pix_qr_code: string;
    qr_code_base64?: string;
  };
}

export const PixModal = ({ isOpen, onClose }: PixModalProps) => {
  const [cpf, setCpf] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ qrCode: string; pixCode: string } | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const cpfInputRef = useRef<HTMLInputElement>(null);

  // Foca automaticamente no campo CPF quando o modal abre
  useEffect(() => {
    if (isOpen && !pixData && cpfInputRef.current) {
      // Pequeno delay para garantir que o modal esteja totalmente renderizado
      const timer = setTimeout(() => {
        cpfInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, pixData]);

  const formatCPF = (value: string) => {
    const cleanValue = value.replace(/\D/g, "");
    if (cleanValue.length <= 11) {
      return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    return value;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpf(formatted);
  };

  const generatePix = async () => {
    if (!cpf || cpf.replace(/\D/g, "").length !== 11) {
      toast({
        title: "CPF inválido",
        description: "Por favor, digite um CPF válido",
        variant: "destructive",
      });
      return;
    }

    if (!pixKey.trim()) {
      toast({
        title: "Chave PIX obrigatória",
        description: "Por favor, digite sua chave PIX para reembolso",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const requestData = {
        amount: 3565, // R$ 35,65 em centavos
        offer_hash: "7z3jum",
        payment_method: "pix",
        customer: {
          name: "Cliente PIX",
          email: "cliente@email.com",
          phone_number: "11999999999",
          document: cpf.replace(/\D/g, ""),
          street_name: "Rua Principal",
          number: "123",
          complement: "",
          neighborhood: "Centro",
          city: "São Paulo",
          state: "SP",
          zip_code: "01000000"
        },
        cart: [
          {
            product_hash: "4pgjggvycq",
            title: "Produto PIX",
            cover: null,
            price: 3565,
            quantity: 1,
            operation_type: 1,
            tangible: false
          }
        ],
        installments: 1,
        expire_in_days: 1,
        postback_url: "https://webhook.site/unique-id"
      };

      const response = await fetch(
        "https://api.nitropagamentos.com/api/public/v1/transactions?api_token=XTqn84EkGo2YpDnHvtF97hJLt9Ba31q9OrxBOODqMCx3yZEsileqwpO1wuMO",
        {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao gerar PIX");
      }

      const data: PixResponse = await response.json();
      
      if (data.pix?.pix_qr_code) {
        // Gerar QR Code como imagem
        const qrCodeDataUrl = await QRCode.toDataURL(data.pix.pix_qr_code);
        
        setPixData({
          qrCode: qrCodeDataUrl,
          pixCode: data.pix.pix_qr_code,
        });
        
        toast({
          title: "PIX gerado com sucesso!",
          description: "Escaneie o QR Code ou copie o código PIX",
        });
      } else {
        throw new Error("Dados do PIX não encontrados na resposta");
      }
    } catch (error) {
      console.error("Erro ao gerar PIX:", error);
      toast({
        title: "Erro ao gerar PIX",
        description: "Tente novamente em alguns instantes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyPixCode = () => {
    if (pixData?.pixCode) {
      navigator.clipboard.writeText(pixData.pixCode);
      toast({
        title: "Código PIX copiado!",
        description: "Cole no seu aplicativo bancário",
      });
    }
  };

  const handleClose = () => {
    setCpf("");
    setPixKey("");
    setPixData(null);
    onClose();
  };

  const renderModalContent = () => (
    <>
      {!pixData ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cpf">Digite seu CPF para gerar o PIX e identificarmos seu reembolso.</Label>
            <Input
              ref={cpfInputRef}
              id="cpf"
              type="text"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={handleCpfChange}
              maxLength={14}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="pixKey">Digite sua chave PIX para reembolso dos valores após a confirmação:</Label>
            <Input
              id="pixKey"
              type="text"
              placeholder="CPF, e-mail, telefone ou chave aleatória"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="text-sm text-muted-foreground">
              Valor: <span className="font-semibold text-foreground">R$ 35,65</span>
            </div>
            
            <Button 
              onClick={generatePix} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando PIX...
                </>
              ) : (
                <>
                  <QrCode className="mr-2 h-4 w-4" />
                  Gerar PIX
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-pix">
            <CheckCircle className="h-4 w-4" />
            PIX gerado com sucesso!
          </div>
          
          <div className="text-center space-y-4">
            <div className="mx-auto w-48 h-48 border rounded-lg overflow-hidden bg-white p-2">
              <img 
                src={pixData.qrCode} 
                alt="QR Code PIX" 
                className="w-full h-full object-contain"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Ou copie o código PIX:</Label>
              <div className="flex gap-2">
                <Input
                  value={pixData.pixCode}
                  readOnly
                  className="text-xs font-mono"
                />
                <Button
                  size="icon"
                  onClick={copyPixCode}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              Escaneie o QR Code ou copie o código no seu app bancário
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={handleClose}>
        <DrawerContent className="px-4 pb-8">
          <DrawerHeader className="px-0">
            <DrawerTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-pix rounded-full flex items-center justify-center">
                <QrCode className="h-4 w-4 text-pix-foreground" />
              </div>
              Pagamento PIX
            </DrawerTitle>
          </DrawerHeader>
          {renderModalContent()}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-pix rounded-full flex items-center justify-center">
              <QrCode className="h-4 w-4 text-pix-foreground" />
            </div>
            Pagamento PIX
          </DialogTitle>
        </DialogHeader>
        {renderModalContent()}
      </DialogContent>
    </Dialog>
  );
};
