import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function LegalModal({ isOpen, setIsOpen }: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="bg-white text-[#0f2f47]">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Astaneh Bold, sans-serif' }} className="text-2xl text-[#0f2f47]">
            Mentions Légales
          </DialogTitle>
        </DialogHeader>
        <div className="prose max-w-none py-4" style={{ fontFamily: 'Open Sans, sans-serif' }}>
          <p>Le texte des mentions légales sera fourni ultérieurement.</p>
          {/* Placeholder for legal text */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
