import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Props {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function ContactModal({ isOpen, setIsOpen }: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="bg-white text-[#0f2f47]">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Astaneh Bold, sans-serif' }} className="text-2xl text-[#0f2f47]">
            Contact Atexya
          </DialogTitle>
          <DialogDescription style={{ fontFamily: 'Open Sans, sans-serif' }} className="text-gray-600 pt-2">
            Vous pouvez nous joindre via les informations ci-dessous.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4" style={{ fontFamily: 'Open Sans, sans-serif' }}>
          <p><strong>Email :</strong> <a href="mailto:contact@atexya.fr" className="text-[#c19a5f] hover:underline">contact@atexya.fr</a></p>
          <p><strong>Téléphone :</strong> <a href="tel:0546961158" className="text-[#c19a5f] hover:underline">05 46 96 11 58</a></p>
          <p><strong>RCS :</strong> B 433 671 930</p>
          <p><strong>ORIAS :</strong> 07001780</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
