"use client";

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  Printer, 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  Receipt,
  FileCheck,
  Building2
} from "lucide-react";
import { toast } from "react-hot-toast";

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  userName: string;
  userEmail: string;
  planName: string;
  billingCycle: "monthly" | "yearly";
  basePrice: number;
  gstAmount: number;
  totalAmount: number;
  paymentId?: string;
  orderId?: string;
}

interface GstInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceData;
}

export default function GstInvoiceModal({
  isOpen,
  onClose,
  invoice
}: GstInvoiceModalProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Trigger print dialog configured for Save as PDF
    toast.success("Opening print dialog — select 'Save as PDF' to download your GST Invoice.");
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const cgst = (invoice.gstAmount / 2).toFixed(2);
  const sgst = (invoice.gstAmount / 2).toFixed(2);

  return (
    <div className="fixed inset-0 bg-[#060713]/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="max-w-2xl w-full bg-[#0d0e1f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:bg-white print:max-w-none print:w-full">
        
        {/* Modal Top Bar (Hidden on Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#070814] print:hidden">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-violet-400" />
            <span className="font-extrabold text-white text-sm">Official GST Tax Invoice</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleDownload}
              size="sm"
              className="bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs h-8 rounded-lg flex items-center gap-1.5 shadow-md shadow-violet-600/20"
            >
              <Download className="h-3.5 w-3.5" />
              Download PDF / Print
            </Button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* INVOICE DOCUMENT BODY */}
        <div ref={invoiceRef} className="p-8 space-y-6 text-slate-200 print:text-black print:p-8 bg-[#0d0e1f] print:bg-white select-text">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b border-white/10 print:border-slate-300 pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <img
                  src="https://qasfeyddyolpdvmiogkl.supabase.co/storage/v1/object/public/assets/logo.png"
                  alt="FastHire AI"
                  className="h-8 w-8 rounded-lg shadow-sm"
                  onError={(e) => { (e.currentTarget as any).style.display = 'none'; }}
                />
                <span className="font-black text-xl text-white print:text-black tracking-tight">FastHire AI</span>
              </div>
              <p className="text-[11px] text-slate-400 print:text-slate-600 font-semibold">FastHire AI Cloud Technologies</p>
              <p className="text-[10px] text-slate-500 print:text-slate-500">SAC Code: 998313 &bull; IT Software as a Service</p>
              <p className="text-[10px] text-slate-500 print:text-slate-500">Support: support@fasthire.ai</p>
            </div>

            <div className="text-right space-y-1">
              <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 print:bg-emerald-100 text-emerald-400 print:text-emerald-800 border border-emerald-500/20 print:border-emerald-300">
                Tax Invoice &bull; PAID ✓
              </span>
              <p className="text-xs font-bold text-white print:text-black mt-2">Invoice #: {invoice.invoiceNumber}</p>
              <p className="text-[11px] text-slate-400 print:text-slate-600">Date: {invoice.date}</p>
              <p className="text-[10px] text-slate-500 print:text-slate-500">Payment: Razorpay Secure</p>
            </div>
          </div>

          {/* Billed To */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1 bg-[#070814] print:bg-slate-50 p-3.5 rounded-xl border border-white/5 print:border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 print:text-slate-500 uppercase tracking-wider block">Billed To</span>
              <p className="font-bold text-white print:text-black text-sm">{invoice.userName || "Valued Subscriber"}</p>
              <p className="text-slate-400 print:text-slate-600">{invoice.userEmail}</p>
            </div>

            <div className="space-y-1 bg-[#070814] print:bg-slate-50 p-3.5 rounded-xl border border-white/5 print:border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 print:text-slate-500 uppercase tracking-wider block">Transaction Details</span>
              <p className="text-slate-300 print:text-slate-700">Billing: <strong className="text-white print:text-black capitalize">{invoice.billingCycle}ly</strong></p>
              <p className="text-slate-400 print:text-slate-600 text-[10px] truncate">Ref: {invoice.paymentId || "rzp_live_" + invoice.invoiceNumber.toLowerCase()}</p>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="border border-white/10 print:border-slate-300 rounded-xl overflow-hidden text-xs">
            <div className="grid grid-cols-12 bg-[#070814] print:bg-slate-100 p-3 font-bold text-slate-400 print:text-slate-700 border-b border-white/5 print:border-slate-300 text-[11px] uppercase tracking-wider">
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-center">SAC</div>
              <div className="col-span-2 text-right">Base Rate</div>
              <div className="col-span-2 text-right">Amount</div>
            </div>

            <div className="p-3 grid grid-cols-12 items-center text-slate-300 print:text-slate-800 border-b border-white/5 print:border-slate-200">
              <div className="col-span-6">
                <span className="font-bold text-white print:text-black block">{invoice.planName}</span>
                <span className="text-[10px] text-slate-500 print:text-slate-500">AI Resume Optimization &amp; ATS Scoring System</span>
              </div>
              <div className="col-span-2 text-center font-mono text-[11px]">998313</div>
              <div className="col-span-2 text-right">₹{invoice.basePrice.toFixed(2)}</div>
              <div className="col-span-2 text-right font-bold text-white print:text-black">₹{invoice.basePrice.toFixed(2)}</div>
            </div>

            {/* Tax Breakdown */}
            <div className="bg-[#070814]/50 print:bg-slate-50/50 p-3 space-y-1.5 text-[11px]">
              <div className="flex justify-between text-slate-400 print:text-slate-600">
                <span>Subtotal (Base)</span>
                <span>₹{invoice.basePrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400 print:text-slate-600">
                <span>CGST (9.00%)</span>
                <span>+₹{cgst}</span>
              </div>
              <div className="flex justify-between text-slate-400 print:text-slate-600">
                <span>SGST (9.00%)</span>
                <span>+₹{sgst}</span>
              </div>
              <div className="flex justify-between text-slate-400 print:text-slate-600">
                <span>Payment Gateway &amp; Processing (2% Surcharge)</span>
                <span>Included</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/10 print:border-slate-300 text-sm font-black text-white print:text-black">
                <span>Total Amount Paid (INR)</span>
                <span className="text-base text-violet-400 print:text-black font-mono">₹{invoice.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="flex justify-between items-end pt-4 border-t border-white/5 print:border-slate-200 text-[10px] text-slate-500 print:text-slate-500">
            <div className="space-y-0.5">
              <p className="font-semibold text-slate-400 print:text-slate-600">Thank you for subscribing to FastHire AI!</p>
              <p>This is a computer-generated GST tax receipt authorized by FastHire AI.</p>
              <p>Payments are 256-Bit encrypted &amp; processed securely by Razorpay.</p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-1 text-emerald-400 print:text-emerald-700 font-bold bg-emerald-500/10 print:bg-emerald-50 px-2 py-1 rounded border border-emerald-500/20 print:border-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Digitally Verified &bull; Razorpay</span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Actions Bottom (Hidden on Print) */}
        <div className="px-6 py-4 bg-[#070814] border-t border-white/5 flex items-center justify-between print:hidden">
          <span className="text-[11px] text-slate-500 font-semibold">Need help? Contact support@fasthire.ai</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-white/10 text-slate-300 hover:text-white text-xs h-8 rounded-lg"
            >
              Close
            </Button>
            <Button
              onClick={handlePrint}
              size="sm"
              className="bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs h-8 rounded-lg flex items-center gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
