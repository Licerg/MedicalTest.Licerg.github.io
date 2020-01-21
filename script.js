function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
var app = new Vue({
    el: '#app',
    data: {
        questions: [],
        do_shuffle: true,
        results:{
            answered: 0,
            correct: 0,
        },
        started: false,
        chunk_size: 20,
        chunk: [],
        chunk_idx: 0,
        chunk_score: 0,
        failed_queue: [],
        showing_error: false,
    }, 
    watch: {
        chunk_size: function(newVal, oldVal){
            newVal = parseInt(newVal);
            if (newVal < 1) this.chunk_size = Math.max(oldVal, 1);
            if (newVal > this.questions.length) this.chunk_size = Math.min(oldVal, this.questions.length);
        }
    },
    created: function(){
    },
    computed: {
        is_ans_radio: function(){
            return this.chunk[this.chunk_idx].answers.filter(function(ans){
                return ans.correct;
            }).length == 1;
        },
        ans_input_type: function(){
            return this.is_ans_radio ? 'radio' : 'checkbox';
        },
        progress_correct: function(){
            return this.chunk_score / this.chunk_size * 100;
        },
        progress_wrong: function(){
            return (this.chunk_idx + (this.showing_error ? 1 : 0) - this.chunk_score) / this.chunk_size * 100;
        },
        total_progress_correct: function(){
            return this.results.correct / this.results.answered * 100;
        },
        total_progress_wrong: function(){
            return (this.results.answered - this.results.correct) / this.results.answered * 100;
        },
        can_next: function(){
            return this.chunk[this.chunk_idx].selected != null || this.chunk[this.chunk_idx].answers.filter(ans => ans.checked).length > 0;
        }
    },
    methods:{
        start:function(){
            let obj = this;
            obj.questions.forEach(function(q, idx){
                q.initial_order = q.initial_order || q.id;
                q.order = obj.do_shuffle.toString() == 'true' ? Math.random() * obj.questions.length : q.initial_order;
                q.shown = q.shown || 0;
                q.correct = q.correct || 0;
            });
            obj.questions.sort(function(a, b){ 
                return a.order < b.order ? -1 : 1;
            });
            obj.generate();
            obj.started = true;
        },
        generate: function(){
            obj = this;
            let failed_size = Math.min(obj.failed_queue.length, Math.max(1, Math.round(obj.chunk_size / 4)));
            let qs = obj.questions.sort(function(a, b){ 
                return  a.shown == b.shown ? (a.order < b.order ? -1 : 1) : (a.shown < b.shown ? -1 : 1);
            }).filter(function(q){
                const idx = obj.failed_queue.indexOf(q.id);
                return idx < 0;
            }).filter(function(q, idx){
                return idx < obj.chunk_size - failed_size;
            });

            while (qs.length < obj.chunk_size){
                let new_idx = Math.floor(Math.random() * qs.length); 
                let failed_id = obj.failed_queue.shift();
                q = obj.questions.find(function(q){
                    return q.id == failed_id;
                });
                qs.splice(new_idx, 0, q);
            }
            for(let i = 0; i < qs.length; i++){
                qs[i].answers = shuffle(qs[i].answers);
            }
            obj.chunk = qs;
            obj.chunk_idx = 0;
            obj.chunk_score = 0;
            obj.showing_error = false;
        },
        next_question: function(){
            let obj = this;
            if (obj.showing_error){
                obj.showing_error = false;
                obj.chunk[obj.chunk_idx].selected = null;
                for(let i = 0; i < obj.chunk[obj.chunk_idx].answers.length; i++){
                    obj.chunk[obj.chunk_idx].answers[i].checked = false;
                }
                if (obj.chunk_idx + 1 < obj.chunk_size){
                    obj.chunk_idx++;
                } else {
                    obj.generate();
                }
                return;
            }
            let q = obj.chunk[this.chunk_idx];
            let real_correct_count = q.answers.filter(ans => ans.correct).length;
            let correct_count = 
                obj.is_ans_radio ? 
                    q.answers.filter((ans, idx) => ans.correct && idx == q.selected).length :
                    obj.chunk[obj.chunk_idx].answers.filter(ans =>  ans.correct == ans.checked).length;
            
            let q_idx = obj.questions.findIndex(x => x.id == q.id);
            obj.questions[q_idx].shown++;
            obj.questions[q_idx].correct += correct_count / real_correct_count;
            obj.chunk_score += correct_count / real_correct_count;
            obj.results.answered ++;
            obj.results.correct += correct_count / real_correct_count;

            if (correct_count != real_correct_count){
                obj.showing_error = true;
                obj.failed_queue.push(q.id);
            } else {
                obj.chunk[obj.chunk_idx].selected = null;
                for(let i = 0; i < obj.chunk[obj.chunk_idx].answers.length; i++){
                    obj.chunk[obj.chunk_idx].answers[i].checked = false;
                }
                if (obj.chunk_idx + 1 < obj.chunk_size){
                    obj.chunk_idx++;
                } else {
                    obj.generate();
                }
            }
        }

    }
});