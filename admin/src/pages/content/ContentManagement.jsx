import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Plus, Save, Trash2 } from "lucide-react";
import api from "../../services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const initialAboutForm = {
  app_name: "",
  tagline_en: "",
  tagline_ar: "",
  tagline_ku: "",
  about_text_en: "",
  about_text_ar: "",
  about_text_ku: "",
  support_email: "",
  support_phone: "",
  support_whatsapp: "",
  website_url: "",
};

const initialFaqForm = {
  question_en: "",
  question_ar: "",
  question_ku: "",
  answer_en: "",
  answer_ar: "",
  answer_ku: "",
  sort_order: 0,
  is_active: true,
};

const normalizeFaq = (faq) => ({
  id: faq.id,
  question_en: faq.question_en || "",
  question_ar: faq.question_ar || "",
  question_ku: faq.question_ku || "",
  answer_en: faq.answer_en || "",
  answer_ar: faq.answer_ar || "",
  answer_ku: faq.answer_ku || "",
  sort_order: Number(faq.sort_order || 0),
  is_active: faq.is_active !== false,
});

const hasAnyQuestion = (faq) =>
  [faq.question_en, faq.question_ar, faq.question_ku].some(
    (v) => typeof v === "string" && v.trim()
  );

const hasAnyAnswer = (faq) =>
  [faq.answer_en, faq.answer_ar, faq.answer_ku].some(
    (v) => typeof v === "string" && v.trim()
  );

const mapFaqPayload = (faq) => ({
  question_en: faq.question_en,
  question_ar: faq.question_ar,
  question_ku: faq.question_ku,
  answer_en: faq.answer_en,
  answer_ar: faq.answer_ar,
  answer_ku: faq.answer_ku,
  sort_order: Number(faq.sort_order || 0),
  is_active: faq.is_active === true,
});

export default function ContentManagement() {
  const [loading, setLoading] = useState(true);
  const [savingAbout, setSavingAbout] = useState(false);
  const [savingFaqId, setSavingFaqId] = useState(null);
  const [creatingFaq, setCreatingFaq] = useState(false);
  const [deletingFaqId, setDeletingFaqId] = useState(null);

  const [aboutForm, setAboutForm] = useState(initialAboutForm);
  const [faqs, setFaqs] = useState([]);
  const [newFaq, setNewFaq] = useState(initialFaqForm);

  const sortedFaqs = useMemo(
    () => [...faqs].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [faqs]
  );

  const fetchContent = async () => {
    try {
      const response = await api.get("/admin/content/about-screen");
      const about = response.data?.about || {};
      const faqItems = Array.isArray(response.data?.faqs) ? response.data.faqs : [];

      setAboutForm({
        ...initialAboutForm,
        ...about,
      });
      setFaqs(faqItems.map(normalizeFaq));
    } catch (error) {
      console.error("Failed to fetch about/faq content:", error);
      toast.error(error.response?.data?.message || "Failed to load content");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const handleAboutChange = (field, value) => {
    setAboutForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveAbout = async () => {
    setSavingAbout(true);
    try {
      const payload = { ...aboutForm };
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;

      await api.patch("/admin/content/about-screen", payload);
      toast.success("About content updated");
      await fetchContent();
    } catch (error) {
      console.error("Failed to update about content:", error);
      toast.error(error.response?.data?.message || "Failed to save about content");
    } finally {
      setSavingAbout(false);
    }
  };

  const handleFaqFieldChange = (faqId, field, value) => {
    setFaqs((prev) =>
      prev.map((faq) =>
        faq.id === faqId
          ? {
              ...faq,
              [field]: value,
            }
          : faq
      )
    );
  };

  const handleSaveFaq = async (faq) => {
    if (!hasAnyQuestion(faq)) {
      toast.error("FAQ must have at least one question");
      return;
    }
    if (!hasAnyAnswer(faq)) {
      toast.error("FAQ must have at least one answer");
      return;
    }

    setSavingFaqId(faq.id);
    try {
      await api.patch(`/admin/content/faqs/${faq.id}`, mapFaqPayload(faq));
      toast.success("FAQ updated");
      await fetchContent();
    } catch (error) {
      console.error("Failed to update FAQ:", error);
      toast.error(error.response?.data?.message || "Failed to save FAQ");
    } finally {
      setSavingFaqId(null);
    }
  };

  const handleCreateFaq = async () => {
    if (!hasAnyQuestion(newFaq)) {
      toast.error("New FAQ must have at least one question");
      return;
    }
    if (!hasAnyAnswer(newFaq)) {
      toast.error("New FAQ must have at least one answer");
      return;
    }

    setCreatingFaq(true);
    try {
      await api.post("/admin/content/faqs", mapFaqPayload(newFaq));
      toast.success("FAQ created");
      setNewFaq(initialFaqForm);
      await fetchContent();
    } catch (error) {
      console.error("Failed to create FAQ:", error);
      toast.error(error.response?.data?.message || "Failed to create FAQ");
    } finally {
      setCreatingFaq(false);
    }
  };

  const handleDeleteFaq = async (faqId) => {
    const confirmed = window.confirm("Delete this FAQ item?");
    if (!confirmed) return;

    setDeletingFaqId(faqId);
    try {
      await api.delete(`/admin/content/faqs/${faqId}`);
      toast.success("FAQ deleted");
      setFaqs((prev) => prev.filter((f) => f.id !== faqId));
    } catch (error) {
      console.error("Failed to delete FAQ:", error);
      toast.error(error.response?.data?.message || "Failed to delete FAQ");
    } finally {
      setDeletingFaqId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">About & FAQ Content</h1>
          <p className="text-gray-600 mt-1">
            Edit About screen data and help/support FAQ items shown in the app.
          </p>
        </div>
      </div>

      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">About App</h2>
          <Button onClick={handleSaveAbout} disabled={savingAbout}>
            <Save className="w-4 h-4" />
            {savingAbout ? "Saving..." : "Save About"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="app_name">App Name</Label>
            <Input
              id="app_name"
              value={aboutForm.app_name}
              onChange={(e) => handleAboutChange("app_name", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website_url">Website URL</Label>
            <Input
              id="website_url"
              value={aboutForm.website_url}
              onChange={(e) => handleAboutChange("website_url", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="support_email">Support Email</Label>
            <Input
              id="support_email"
              value={aboutForm.support_email}
              onChange={(e) => handleAboutChange("support_email", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="support_phone">Support Phone</Label>
            <Input
              id="support_phone"
              value={aboutForm.support_phone}
              onChange={(e) => handleAboutChange("support_phone", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="support_whatsapp">Support WhatsApp</Label>
            <Input
              id="support_whatsapp"
              value={aboutForm.support_whatsapp}
              onChange={(e) => handleAboutChange("support_whatsapp", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="tagline_en">Tagline (EN)</Label>
            <Input
              id="tagline_en"
              value={aboutForm.tagline_en}
              onChange={(e) => handleAboutChange("tagline_en", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tagline_ar">Tagline (AR)</Label>
            <Input
              id="tagline_ar"
              value={aboutForm.tagline_ar}
              onChange={(e) => handleAboutChange("tagline_ar", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tagline_ku">Tagline (KU)</Label>
            <Input
              id="tagline_ku"
              value={aboutForm.tagline_ku}
              onChange={(e) => handleAboutChange("tagline_ku", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="about_text_en">About Text (EN)</Label>
            <Textarea
              id="about_text_en"
              rows={5}
              value={aboutForm.about_text_en}
              onChange={(e) => handleAboutChange("about_text_en", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="about_text_ar">About Text (AR)</Label>
            <Textarea
              id="about_text_ar"
              rows={5}
              value={aboutForm.about_text_ar}
              onChange={(e) => handleAboutChange("about_text_ar", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="about_text_ku">About Text (KU)</Label>
            <Textarea
              id="about_text_ku"
              rows={5}
              value={aboutForm.about_text_ku}
              onChange={(e) => handleAboutChange("about_text_ku", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Add FAQ</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Question (EN)</Label>
            <Input
              value={newFaq.question_en}
              onChange={(e) =>
                setNewFaq((prev) => ({ ...prev, question_en: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Question (AR)</Label>
            <Input
              value={newFaq.question_ar}
              onChange={(e) =>
                setNewFaq((prev) => ({ ...prev, question_ar: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Question (KU)</Label>
            <Input
              value={newFaq.question_ku}
              onChange={(e) =>
                setNewFaq((prev) => ({ ...prev, question_ku: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Answer (EN)</Label>
            <Textarea
              rows={4}
              value={newFaq.answer_en}
              onChange={(e) =>
                setNewFaq((prev) => ({ ...prev, answer_en: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Answer (AR)</Label>
            <Textarea
              rows={4}
              value={newFaq.answer_ar}
              onChange={(e) =>
                setNewFaq((prev) => ({ ...prev, answer_ar: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Answer (KU)</Label>
            <Textarea
              rows={4}
              value={newFaq.answer_ku}
              onChange={(e) =>
                setNewFaq((prev) => ({ ...prev, answer_ku: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="space-y-1.5 w-40">
            <Label>Sort Order</Label>
            <Input
              type="number"
              value={newFaq.sort_order}
              onChange={(e) =>
                setNewFaq((prev) => ({
                  ...prev,
                  sort_order: Number(e.target.value || 0),
                }))
              }
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Checkbox
              id="new_faq_active"
              checked={newFaq.is_active}
              onCheckedChange={(checked) =>
                setNewFaq((prev) => ({ ...prev, is_active: checked === true }))
              }
            />
            <Label htmlFor="new_faq_active">Active</Label>
          </div>
        </div>
        <Button onClick={handleCreateFaq} disabled={creatingFaq}>
          <Plus className="w-4 h-4" />
          {creatingFaq ? "Adding..." : "Add FAQ"}
        </Button>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Existing FAQ Items</h2>
        {sortedFaqs.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-gray-600">
            No FAQ items found.
          </div>
        ) : (
          sortedFaqs.map((faq) => (
            <div key={faq.id} className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">FAQ #{faq.id}</h3>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSaveFaq(faq)}
                    disabled={savingFaqId === faq.id}
                  >
                    <Save className="w-4 h-4" />
                    {savingFaqId === faq.id ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteFaq(faq.id)}
                    disabled={deletingFaqId === faq.id}
                  >
                    <Trash2 className="w-4 h-4" />
                    {deletingFaqId === faq.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Question (EN)</Label>
                  <Input
                    value={faq.question_en}
                    onChange={(e) =>
                      handleFaqFieldChange(faq.id, "question_en", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Question (AR)</Label>
                  <Input
                    value={faq.question_ar}
                    onChange={(e) =>
                      handleFaqFieldChange(faq.id, "question_ar", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Question (KU)</Label>
                  <Input
                    value={faq.question_ku}
                    onChange={(e) =>
                      handleFaqFieldChange(faq.id, "question_ku", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Answer (EN)</Label>
                  <Textarea
                    rows={4}
                    value={faq.answer_en}
                    onChange={(e) =>
                      handleFaqFieldChange(faq.id, "answer_en", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Answer (AR)</Label>
                  <Textarea
                    rows={4}
                    value={faq.answer_ar}
                    onChange={(e) =>
                      handleFaqFieldChange(faq.id, "answer_ar", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Answer (KU)</Label>
                  <Textarea
                    rows={4}
                    value={faq.answer_ku}
                    onChange={(e) =>
                      handleFaqFieldChange(faq.id, "answer_ku", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="space-y-1.5 w-40">
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    value={faq.sort_order}
                    onChange={(e) =>
                      handleFaqFieldChange(
                        faq.id,
                        "sort_order",
                        Number(e.target.value || 0)
                      )
                    }
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox
                    id={`faq_active_${faq.id}`}
                    checked={faq.is_active}
                    onCheckedChange={(checked) =>
                      handleFaqFieldChange(faq.id, "is_active", checked === true)
                    }
                  />
                  <Label htmlFor={`faq_active_${faq.id}`}>Active</Label>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

