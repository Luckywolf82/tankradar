import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Settings() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleAccountDeletion = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDeletion = () => {
    setShowDeleteConfirm(false);
    // TODO: Implement actual deletion flow when ready
    // For now, show support contact information
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Innstillinger</h1>
        <p className="text-slate-600">Administrer din konto og appinnstillinger</p>
      </div>

      {/* Account Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Konto</CardTitle>
          <CardDescription>Kontoadministrasjon og databehandling</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="ml-2 text-amber-800 text-sm">
              Sletting av konto er permanent og kan ikke reverseres.
            </AlertDescription>
          </Alert>

          <div className="pt-4">
            <Button
              variant="destructive"
              onClick={handleAccountDeletion}
              className="w-full"
            >
              Slett konto
            </Button>
            <p className="text-xs text-slate-500 mt-2">
              Når du sletter kontoen din, vil alle dine data bli permanent fjernet fra systemet.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Account Deletion Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett konto?</AlertDialogTitle>
            <AlertDialogDescription>
              Sletting av konto er permanent og kan ikke reverseres. Alle dine data vil bli fjernet fra systemet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDeletion}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Slett konto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* App Info */}
      <Card>
        <CardHeader>
          <CardTitle>App-informasjon</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <div>
            <p className="font-semibold text-slate-900">Versjon</p>
            <p>1.0.0</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Plattform</p>
            <p>TankRadar</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900 mb-2">Hjelp</p>
            <p>
              For spørsmål eller support, kontakt{" "}
              <a href="mailto:support@tankradar.no" className="text-blue-600 hover:underline">
                support@tankradar.no
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}